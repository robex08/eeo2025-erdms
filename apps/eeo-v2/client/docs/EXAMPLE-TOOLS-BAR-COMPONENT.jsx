/**
 * Příklad komponenty ToolsBar s podporou viditelnosti ikon nástrojů
 * 
 * Tato komponenta zobrazuje plovoucí panel s ikonami nástrojů.
 * Viditelnost jednotlivých ikon je řízena uživatelským nastavením.
 */

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { getToolsVisibility, hasVisibleTools } from '../utils/toolsVisibility';

// ==============================================================================
// STYLED COMPONENTS
// ==============================================================================

const ToolsBarContainer = styled.div`
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
`;

const ToolButton = styled.button`
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: scale(0.95);
  }

  &::after {
    content: attr(data-tooltip);
    position: absolute;
    right: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%) scale(0);
    background: #1e293b;
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    transition: all 0.2s ease;
    pointer-events: none;
  }

  &:hover::after {
    transform: translateY(-50%) scale(1);
    opacity: 1;
  }
`;

// ==============================================================================
// KOMPONENTA
// ==============================================================================

const ToolsBar = () => {
  const [toolsVisibility, setToolsVisibility] = useState(getToolsVisibility());
  const [notesOpen, setNotesOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Aktualizovat viditelnost při změně nastavení
  useEffect(() => {
    const handleStorageChange = () => {
      setToolsVisibility(getToolsVisibility());
    };

    window.addEventListener('storage', handleStorageChange);

    // Také poslouchat vlastní event pro změnu nastavení
    window.addEventListener('userSettingsChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userSettingsChanged', handleStorageChange);
    };
  }, []);

  // Nezobrazovat panel, pokud nejsou žádné viditelné nástroje
  if (!hasVisibleTools()) {
    return null;
  }

  // Handler funkce pro jednotlivé nástroje
  const handleNotesClick = () => {
    console.log('Otevírám poznámky...');
    setNotesOpen(true);
    // TODO: Implementovat otevření poznámek
  };

  const handleTodoClick = () => {
    console.log('Otevírám TODO...');
    setTodoOpen(true);
    // TODO: Implementovat otevření TODO seznamu
  };

  const handleChatClick = () => {
    console.log('Otevírám chat...');
    setChatOpen(true);
    // TODO: Implementovat otevření chatu
  };

  const handleCalculatorClick = () => {
    console.log('Otevírám kalkulačku...');
    setCalculatorOpen(true);
    // TODO: Implementovat otevření kalkulačky
  };

  return (
    <ToolsBarContainer>
      {toolsVisibility.notes && (
        <ToolButton
          onClick={handleNotesClick}
          data-tooltip="Poznámky"
          title="Poznámky (Notes)"
        >
          📝
        </ToolButton>
      )}

      {toolsVisibility.todo && (
        <ToolButton
          onClick={handleTodoClick}
          data-tooltip="TODO"
          title="TODO seznam"
        >
          ✅
        </ToolButton>
      )}

      {toolsVisibility.chat && (
        <ToolButton
          onClick={handleChatClick}
          data-tooltip="Chat"
          title="Chat"
        >
          💬
        </ToolButton>
      )}

      {toolsVisibility.kalkulacka && (
        <ToolButton
          onClick={handleCalculatorClick}
          data-tooltip="Kalkulačka"
          title="Kalkulačka"
        >
          🧮
        </ToolButton>
      )}
    </ToolsBarContainer>
  );
};

export default ToolsBar;

// ==============================================================================
// POUŽITÍ V APP.JS
// ==============================================================================

/*
import ToolsBar from './components/ToolsBar';

function App() {
  return (
    <div className="app">
      <Header />
      <MainContent />
      <ToolsBar />  {/* Zobrazí se pouze pokud jsou nějaké nástroje viditelné *}
      <Footer />
    </div>
  );
}
*/

// ==============================================================================
// POZNÁMKY
// ==============================================================================

/*
1. Komponenta automaticky reaguje na změnu nastavení v ProfilePage
2. Pokud uživatel vypne všechny nástroje, panel se vůbec nezobrazí
3. Tooltip se zobrazí po najetí myší
4. Animace pro hover efekt
5. Responzivní design - pozice vpravo uprostřed obrazovky

Pro plnou funkcionalitu je potřeba implementovat:
- Modální okna nebo panely pro jednotlivé nástroje
- Persistence stavu (např. otevřené poznámky)
- Komunikaci s backendem pro ukládání dat
*/
