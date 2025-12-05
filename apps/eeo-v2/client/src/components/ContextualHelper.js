import React, { useState, useContext } from 'react';
import ReactDOM from 'react-dom';
import { AuthContext } from '../context/AuthContext';
import './ContextualHelper.css';
import { ASSETS } from '../config/assets';

/**
 * ContextualHelper - Kontextový pomocník (Bitcoin avatar)
 *
 * Komponenta zobrazuje Bitcoin avatara v levém spodním rohu s kontextovou nápovědou.
 * Viditelná pouze pro uživatele s oprávněním HELPER_VIEW.
 * Renderuje se přes React Portal aby byla vždy navrchu.
 *
 * @param {string} pageContext - Kontext stránky pro zobrazení specifické nápovědy
 * @param {string} customTip - Vlastní nápověda (přepisuje výchozí)
 * @param {boolean} autoShow - Automaticky zobrazit bublinu při načtení (default: false)
 *
 * @example
 * <ContextualHelper pageContext="pokladniKniha" />
 * <ContextualHelper pageContext="objednavka" autoShow={true} />
 * <ContextualHelper customTip="Vlastní nápověda pro tuto stránku" />
 */
const ContextualHelper = ({ pageContext = 'default', customTip = null, autoShow = false }) => {
  const { hasPermission } = useContext(AuthContext);
  const [isBubbleOpen, setIsBubbleOpen] = useState(autoShow);
  const [isMinimized, setIsMinimized] = useState(false);

  // 🔒 Kontrola oprávnění - pokud uživatel nemá právo, komponentu nezobrazíme
  if (!hasPermission || !hasPermission('HELPER_VIEW')) {
    return null;
  }

  // 📚 Slovník kontextových nápověd
  const helpTips = {
    // Pokladní kniha - REÁLNÉ TIPY PRO POKLADNU
    pokladniKniha: {
      title: "💰 Pokladní kniha",
      content: "💡 Vyplňte datum, částku a popis transakce.\n\n� Nezapomeňte kliknout Uložit po každé změně!\n\n✅ Zkontrolujte konečný zůstatek před uzavřením měsíce."
    },

    // Objednávky - REÁLNÉ TIPY PRO OBJEDNÁVKU
    objednavka: {
      title: "� Objednávka",
      content: "✅ Vyplňte dodavatele, kategorie a položky.\n\n� Klikněte Uložit změny vpravo nahoře!\n\n� Přiložte sken objednávky před odesláním."
    },

    // Výchozí
    default: {
      title: "💡 Nápověda",
      content: "👋 Potřebujete pomoc? Klikněte na mě!"
    }
  };

  // Výběr nápovědy podle kontextu
  const currentTip = customTip
    ? { title: "💡 Nápověda", content: customTip }
    : (helpTips[pageContext] || helpTips.default);

  // Handler pro kliknutí na avatara
  const handleAvatarClick = () => {
    if (isMinimized) {
      setIsMinimized(false);
    }
    setIsBubbleOpen(!isBubbleOpen);
  };

  // Handler pro zavření bubliny
  const handleCloseBubble = (e) => {
    e.stopPropagation();
    setIsBubbleOpen(false);
  };

  // Handler pro minimalizaci
  const handleMinimize = (e) => {
    e.stopPropagation();
    setIsMinimized(true);
    setIsBubbleOpen(false);
  };

  // Renderuj přes portal aby byl vždy navrchu
  return ReactDOM.createPortal(
    <div className={`contextual-helper-container ${isMinimized ? 'minimized' : ''}`}>
      {/* Bublina s nápovědou */}
      {isBubbleOpen && !isMinimized && (
        <div className="helper-bubble">
          <div className="helper-bubble-header">
            <span className="helper-bubble-title">{currentTip.title}</span>
            <div className="helper-bubble-controls">
              <button
                className="helper-bubble-minimize"
                onClick={handleMinimize}
                title="Minimalizovat"
                aria-label="Minimalizovat"
              >
                −
              </button>
              <button
                className="helper-bubble-close"
                onClick={handleCloseBubble}
                title="Zavřít"
                aria-label="Zavřít nápovědu"
              >
                ×
              </button>
            </div>
          </div>
          <div className="helper-bubble-content">
            {currentTip.content}
          </div>
          {/* Šipka směřující k avatarovi */}
          <div className="helper-bubble-arrow"></div>
        </div>
      )}

      {/* Avatar (Bitcoin symbol) */}
      <div
        className={`helper-avatar ${isBubbleOpen ? 'active' : ''}`}
        onClick={handleAvatarClick}
        role="button"
        tabIndex={0}
        aria-label="Zobrazit nápovědu"
        title="Klikněte pro zobrazení nápovědy"
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleAvatarClick();
          }
        }}
      >
        <img
          src={ASSETS.BITCOIN_COIN}
          alt="Bitcoin pomocník"
          className="helper-avatar-image"
        />
        {/* Pulzující indikátor pro upozornění */}
        {!isBubbleOpen && !isMinimized && (
          <div className="helper-pulse"></div>
        )}
      </div>

      {/* Nápis "Pomoc" pod avatarem */}
      {!isMinimized && (
        <div className="helper-label">
          Pomoc
        </div>
      )}
    </div>,
    document.body // Renderuj do body (React Portal)
  );
};

export default ContextualHelper;
