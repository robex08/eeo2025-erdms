import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';

/**
 * 🎯 SMART TOOLTIP - Inteligentní pozicování tooltipů
 *
 * FEATURES:
 * - Automatická detekce okrajů obrazovky
 * - Přepíná stranu pokud se nevejde
 * - Vypočítává pozici PŘED zobrazením (bez "hopsání")
 * - Plynulá animace
 *
 * POUŽITÍ:
 * <SmartTooltip text="Tooltip text" icon="info">
 *   <button>Hover me</button>
 * </SmartTooltip>
 */

const TooltipBubble = styled.div`
  position: fixed;
  background: rgba(0, 0, 0, 0.67);
  color: white;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: ${props => props.$multiline ? 'normal' : 'nowrap'};
  max-width: ${props => props.$multiline ? '300px' : 'none'};
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: ${props => props.$interactive ? 'auto' : 'none'};
  z-index: 999999;
  line-height: 1.6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;

  /* Pozicování */
  left: ${props => props.$x}px;
  top: ${props => props.$y}px;

  /* 🎯 FÁZE MĚŘENÍ - skrytý, ale vykreslený pro získání rozměrů */
  visibility: ${props => props.$measuring ? 'hidden' : 'visible'};

  /* Animace - pouze pokud není measuring */
  opacity: ${props => props.$measuring ? 0 : (props.$visible ? 1 : 0)};
  transform: ${props => {
    if (props.$measuring) return 'scale(1)';
    const scale = props.$visible ? 'scale(1)' : 'scale(0.95)';
    const translate = props.$position === 'top' ? 'translateY(-2px)' :
                     props.$position === 'bottom' ? 'translateY(2px)' :
                     props.$position === 'left' ? 'translateX(-2px)' : 'translateX(2px)';
    return props.$visible ? `${scale}` : `${scale} ${translate}`;
  }};
  transition: ${props => props.$measuring ? 'none' : 'opacity 0.2s ease, transform 0.2s ease'};

  /* Ikonka */
  &::before {
    content: ${props => {
      const icons = {
        'info': "'ℹ️'",
        'success': "'✅'",
        'warning': "'⚠️'",
        'error': "'❌'",
        'database': "'💾'",
        'cache': "'⚡'",
        'time': "'⏱️'",
        'calendar': "'📅'",
        'none': 'none'
      };
      return icons[props.$icon] || icons.info;
    }};
    font-size: 1rem;
    flex-shrink: 0;
    display: ${props => props.$icon === 'none' ? 'none' : 'inline'};
  }

  /* Šipka */
  &::after {
    content: '';
    position: absolute;
    border: 8px solid transparent;
    filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.3));

    /* Pozice šipky podle strany tooltipů */
    ${props => {
      const arrowPos = `${props.$arrowOffset}%`;

      if (props.$position === 'top') {
        return `
          top: 100%;
          left: ${arrowPos};
          transform: translateX(-50%);
          border-top-color: rgba(0, 0, 0, 0.67);
        `;
      } else if (props.$position === 'bottom') {
        return `
          bottom: 100%;
          left: ${arrowPos};
          transform: translateX(-50%);
          border-bottom-color: rgba(0, 0, 0, 0.67);
        `;
      } else if (props.$position === 'left') {
        return `
          left: 100%;
          top: ${arrowPos};
          transform: translateY(-50%);
          border-left-color: rgba(0, 0, 0, 0.67);
        `;
      } else { // right
        return `
          right: 100%;
          top: ${arrowPos};
          transform: translateY(-50%);
          border-right-color: rgba(0, 0, 0, 0.67);
        `;
      }
    }}
  }
`;

export const SmartTooltip = ({
  children,
  text,
  icon = 'info',
  preferredPosition = 'top',
  multiline = false,
  disabled = false,
  interactive = false
}) => {
  const childRef = useRef(null);
  const tooltipRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false); // ✅ NOVÝ STATE pro tracking kliknutí
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({
    x: 0,
    y: 0,
    position: preferredPosition,
    arrowOffset: 50,
    visible: false
  });

  // Obal pro bezpečné získání refu bez přidávání ref na funkční komponenty
  const childElement = React.Children.only(children);
  const handleMouseEnter = (e) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    if (!isClicked) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsHovered(false);
        setIsClicked(false);
      }, 120);
    } else {
      setIsHovered(false);
      setIsClicked(false);
    }
  };

  const handleTooltipMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setIsClicked(false);
    }, 80);
  };

  const handleMouseDown = () => {
    setIsHovered(false);
    setIsClicked(true);
  };

  const handleClick = () => {
    setIsHovered(false);
    setIsClicked(true);
  };

  useEffect(() => {
    // ✅ Skryj tooltip pokud není hovered NEBO bylo kliknuto NEBO je disabled
    if (!isHovered || isClicked || disabled) {
      setTooltipStyle(prev => ({ ...prev, visible: false }));
      setIsMeasuring(false);
      return;
    }

    // 🎯 FÁZE 1: MĚŘENÍ - Vyrenderuj tooltip skrytý pro získání rozměrů
    setIsMeasuring(true);
    setTooltipStyle({
      x: 0,
      y: 0,
      position: preferredPosition,
      visible: false
    });

    // 🎯 FÁZE 2: VÝPOČET POZICE
    const calculatePosition = () => {
      if (!childRef.current || !tooltipRef.current) {
        return;
      }

      const container = childRef.current.getBoundingClientRect();
      const tooltip = tooltipRef.current.getBoundingClientRect();

      if (tooltip.width === 0 || tooltip.height === 0) {
        // Retry after short delay
        setTimeout(calculatePosition, 10);
        return;
      }

      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };

      const MARGIN = 10;
      const ARROW_SIZE = 10;

      let x = 0;
      let y = 0;
      let finalPosition = preferredPosition;
      let arrowOffset = 50; // Šipka uprostřed (50%) jako default

      // 1️⃣ ZKUS PREFEROVANOU POZICI
      if (preferredPosition === 'top' || preferredPosition === 'bottom') {
        // Horizontální centrování
        const idealX = container.left + container.width / 2 - tooltip.width / 2;
        x = idealX;

        // Vertikální pozice
        if (preferredPosition === 'top') {
          y = container.top - tooltip.height - ARROW_SIZE;
        } else {
          y = container.bottom + ARROW_SIZE;
        }

        // ✅ KONTROLA HORIZONTÁLNÍCH OKRAJŮ
        if (x < MARGIN) {
          // Tooltip přetéká vlevo - vypočítej offset šipky
          const containerCenter = container.left + container.width / 2;
          arrowOffset = ((containerCenter - MARGIN) / tooltip.width) * 100;
          arrowOffset = Math.max(10, Math.min(90, arrowOffset)); // Min 10%, max 90%
          x = MARGIN;
        } else if (x + tooltip.width > viewport.width - MARGIN) {
          // Tooltip přetéká vpravo - vypočítej offset šipky
          const containerCenter = container.left + container.width / 2;
          const newX = viewport.width - tooltip.width - MARGIN;
          arrowOffset = ((containerCenter - newX) / tooltip.width) * 100;
          arrowOffset = Math.max(10, Math.min(90, arrowOffset)); // Min 10%, max 90%
          x = newX;
        }

        // ✅ KONTROLA VERTIKÁLNÍCH OKRAJŮ - přepni stranu
        if (preferredPosition === 'top' && y < MARGIN) {
          finalPosition = 'bottom';
          y = container.bottom + ARROW_SIZE;
        } else if (preferredPosition === 'bottom' && y + tooltip.height > viewport.height - MARGIN) {
          finalPosition = 'top';
          y = container.top - tooltip.height - ARROW_SIZE;
        }
      } else {
        // LEFT nebo RIGHT pozice
        const idealY = container.top + container.height / 2 - tooltip.height / 2;
        y = idealY;

        if (preferredPosition === 'left') {
          x = container.left - tooltip.width - ARROW_SIZE;
        } else {
          x = container.right + ARROW_SIZE;
        }

        // ✅ KONTROLA VERTIKÁLNÍCH OKRAJŮ
        if (y < MARGIN) {
          // Tooltip přetéká nahoru - vypočítej offset šipky
          const containerCenter = container.top + container.height / 2;
          arrowOffset = ((containerCenter - MARGIN) / tooltip.height) * 100;
          arrowOffset = Math.max(10, Math.min(90, arrowOffset)); // Min 10%, max 90%
          y = MARGIN;
        } else if (y + tooltip.height > viewport.height - MARGIN) {
          // Tooltip přetéká dolů - vypočítej offset šipky
          const containerCenter = container.top + container.height / 2;
          const newY = viewport.height - tooltip.height - MARGIN;
          arrowOffset = ((containerCenter - newY) / tooltip.height) * 100;
          arrowOffset = Math.max(10, Math.min(90, arrowOffset)); // Min 10%, max 90%
          y = newY;
        }

        // ✅ KONTROLA HORIZONTÁLNÍCH OKRAJŮ - přepni stranu
        if (preferredPosition === 'left' && x < MARGIN) {
          finalPosition = 'right';
          x = container.right + ARROW_SIZE;
        } else if (preferredPosition === 'right' && x + tooltip.width > viewport.width - MARGIN) {
          finalPosition = 'left';
          x = container.left - tooltip.width - ARROW_SIZE;
        }
      }

      // 2️⃣ NASTAV POZICI
      setTooltipStyle({
        x: Math.round(x),
        y: Math.round(y),
        position: finalPosition,
        arrowOffset: Math.round(arrowOffset),
        visible: false
      });

      // 3️⃣ ZOBRAZ PO DOKONČENÍ LAYOUTU
      setIsMeasuring(false);
      requestAnimationFrame(() => {
        setTooltipStyle(prev => ({ ...prev, visible: true }));
      });
    };

    // Spusť výpočet po vykreslení measuring fáze
    requestAnimationFrame(() => {
      requestAnimationFrame(calculatePosition);
    });

    // Přepočítej při scroll nebo resize
    const handleUpdate = () => {
      if (isHovered && !disabled) {
        calculatePosition();
      }
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isHovered, isClicked, preferredPosition, disabled]); // ✅ Přidán isClicked do dependencies

  if (disabled || !text) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        ref={childRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        style={{ display: 'inline-flex' }}
      >
        {childElement}
      </span>
      {(isHovered && !isClicked) && createPortal( // ✅ Zobraz tooltip pouze pokud je hovered A nebylo kliknuto
        <TooltipBubble
          ref={tooltipRef}
          $x={tooltipStyle.x}
          $y={tooltipStyle.y}
          $position={tooltipStyle.position}
          $arrowOffset={tooltipStyle.arrowOffset}
          $visible={tooltipStyle.visible}
          $measuring={isMeasuring}
          $icon={icon}
          $multiline={multiline}
          $interactive={interactive}
          onMouseEnter={interactive ? handleTooltipMouseEnter : undefined}
          onMouseLeave={interactive ? handleTooltipMouseLeave : undefined}
        >
          {text}
        </TooltipBubble>,
        document.body
      )}
    </>
  );
};

export default SmartTooltip;
