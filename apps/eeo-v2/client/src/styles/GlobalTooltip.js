import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';

/**
 * Globální Tooltip komponenta pro jednotný vzhled napříč celou aplikací
 * Použití: Obalit element s touto komponentou a nastavit .tooltip child
 */
const TooltipWrapperStyled = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;

  /* Tooltip element */
  .tooltip,
  .cache-tooltip {
    position: absolute;
    top: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.67);
    color: white;
    padding: 0.5rem 0.875rem;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.4);
    font-size: 0.85rem;
    font-weight: 600;
    white-space: nowrap;
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.4),
      0 2px 8px rgba(0, 0, 0, 0.25),
      inset 0 1px 0 rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 999999;
    line-height: 1.6;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    gap: 0.5rem;

    /* Ikonka na začátku tooltipů */
    &::before {
      content: 'ℹ️';
      font-size: 1rem;
      flex-shrink: 0;
    }

    /* Varianty ikon pomocí data-icon atributu */
    &[data-icon="info"]::before { content: 'ℹ️'; }
    &[data-icon="success"]::before { content: '✅'; }
    &[data-icon="warning"]::before { content: '⚠️'; }
    &[data-icon="error"]::before { content: '❌'; }
    &[data-icon="database"]::before { content: '💾'; }
    &[data-icon="cache"]::before { content: '⚡'; }
    &[data-icon="time"]::before { content: '⏱️'; }
    &[data-icon="calendar"]::before { content: '📅'; }
    &[data-icon="none"]::before { content: none; }

    backdrop-filter: blur(10px);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s ease;
    z-index: 999999;
    line-height: 1.6;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);

    /* Šipka nahoru */
    &::after {
      content: '';
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-bottom-color: rgba(0, 0, 0, 0.67);
      filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.3));
    }
  }

  /* Varianty pozicování */
  .tooltip-top,
  .tooltip.top {
    top: auto;
    bottom: calc(100% + 10px);

    &::after {
      bottom: auto;
      top: 100%;
      border-bottom-color: transparent;
      border-top-color: rgba(0, 0, 0, 0.67);
    }
  }

  .tooltip-right,
  .tooltip.right {
    top: 50%;
    left: calc(100% + 10px);
    transform: translateY(-50%);

    &::after {
      top: 50%;
      left: auto;
      right: 100%;
      bottom: auto;
      transform: translateY(-50%);
      border-bottom-color: transparent;
      border-right-color: rgba(0, 0, 0, 0.67);
    }
  }

  .tooltip-left,
  .tooltip.left {
    top: 50%;
    left: auto;
    right: calc(100% + 10px);
    transform: translateY(-50%);

    &::after {
      top: 50%;
      left: 100%;
      right: auto;
      bottom: auto;
      transform: translateY(-50%);
      border-bottom-color: transparent;
      border-left-color: rgba(0, 0, 0, 0.67);
    }
  }

  /* Multi-line tooltips */
  .tooltip-multiline,
  .tooltip.multiline {
    white-space: normal;
    max-width: 300px;
    text-align: center;
  }

  /* Zobrazení při hover */
  &:hover .tooltip,
  &:hover .cache-tooltip {
    opacity: 1;
  }
`;

/**
 * Samostatný Tooltip element (bez wrapperu)
 * Použití: Pro custom pozicování nebo kdy už máte vlastní wrapper
 */
export const Tooltip = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.67);
  color: white;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 999999;
  line-height: 1.6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);

  &::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 8px solid transparent;
    border-bottom-color: rgba(0, 0, 0, 0.67);
    filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.3));
  }

  ${props => props.$visible && `
    opacity: 1;
  `}

  ${props => props.$position === 'top' && `
    top: auto;
    bottom: calc(100% + 10px);

    &::after {
      bottom: auto;
      top: 100%;
      border-bottom-color: transparent;
      border-top-color: rgba(0, 0, 0, 0.67);
    }
  `}

  ${props => props.$position === 'right' && `
    top: 50%;
    left: calc(100% + 10px);
    transform: translateY(-50%);

    &::after {
      top: 50%;
      left: auto;
      right: 100%;
      bottom: auto;
      transform: translateY(-50%);
      border-bottom-color: transparent;
      border-right-color: rgba(0, 0, 0, 0.67);
    }
  `}

  ${props => props.$position === 'left' && `
    top: 50%;
    left: auto;
    right: calc(100% + 10px);
    transform: translateY(-50%);

    &::after {
      top: 50%;
      left: 100%;
      right: auto;
      bottom: auto;
      transform: translateY(-50%);
      border-bottom-color: transparent;
      border-left-color: rgba(0, 0, 0, 0.67);
    }
  `}

  ${props => props.$multiline && `
    white-space: normal;
    max-width: 300px;
    text-align: center;
  `}
`;

/**
 * Tooltip s malým paddingem (kompaktní verze)
 */
export const TooltipCompact = styled(Tooltip)`
  padding: 0.375rem 0.625rem;
  font-size: 0.8rem;
`;

/**
 * CSS Mixin pro tooltip styling (použití v existujících styled components)
 */
export const tooltipStyles = `
  background: rgba(0, 0, 0, 0.67);
  color: white;
  padding: 0.5rem 0.875rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  pointer-events: none;
  z-index: 999999;
  line-height: 1.6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

/**
 * CSS pro tooltip šipku
 */
export const tooltipArrowStyles = (direction = 'bottom') => {
  const arrowMap = {
    bottom: `
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-bottom-color: rgba(0, 0, 0, 0.67);
    `,
    top: `
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 8px solid transparent;
      border-top-color: rgba(0, 0, 0, 0.67);
    `,
    right: `
      top: 50%;
      right: 100%;
      transform: translateY(-50%);
      border: 8px solid transparent;
      border-right-color: rgba(0, 0, 0, 0.67);
    `,
    left: `
      top: 50%;
      left: 100%;
      transform: translateY(-50%);
      border: 8px solid transparent;
      border-left-color: rgba(0, 0, 0, 0.67);
    `
  };

  return `
    content: '';
    position: absolute;
    ${arrowMap[direction] || arrowMap.bottom}
    filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.3));
  `;
};

/**
 * 🎯 TOOLTIP WRAPPER REACT KOMPONENTA
 * 
 * Použití s propsy:
 * <TooltipWrapper text="Jednoduchý text" position="top">
 *   <button>Hover me</button>
 * </TooltipWrapper>
 * 
 * <TooltipWrapper content={<div>Složitý JSX obsah</div>} position="bottom">
 *   <button>Hover me</button>
 * </TooltipWrapper>
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
  max-width: ${props => props.$multiline ? '350px' : 'none'};
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.4),
    0 2px 8px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
  z-index: 999999;
  line-height: 1.6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  
  /* Pozicování */
  left: ${props => props.$x}px;
  top: ${props => props.$y}px;
  
  /* Viditelnost a animace */
  opacity: ${props => props.$visible ? 1 : 0};
  transform: ${props => {
    const scale = props.$visible ? 'scale(1)' : 'scale(0.95)';
    const translate = props.$position === 'top' ? 'translateY(-2px)' :
                     props.$position === 'bottom' ? 'translateY(2px)' :
                     props.$position === 'left' ? 'translateX(-2px)' : 'translateX(2px)';
    return props.$visible ? scale : `${scale} ${translate}`;
  }};
  transition: opacity 0.2s ease, transform 0.2s ease;

  /* Šipka */
  &::after {
    content: '';
    position: absolute;
    border: 8px solid transparent;
    filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.3));

    ${props => {
      if (props.$position === 'top') {
        return `
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-top-color: rgba(0, 0, 0, 0.67);
        `;
      } else if (props.$position === 'bottom') {
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-bottom-color: rgba(0, 0, 0, 0.67);
        `;
      } else if (props.$position === 'left') {
        return `
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-left-color: rgba(0, 0, 0, 0.67);
        `;
      } else { // right
        return `
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          border-right-color: rgba(0, 0, 0, 0.67);
        `;
      }
    }}
  }
`;

export const TooltipWrapper = ({
  children,
  text,
  content,
  position = 'top',
  showDelay = 300,
  disabled = false
}) => {
  const childRef = useRef(null);
  const tooltipRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [finalPosition, setFinalPosition] = useState(position);
  const timeoutRef = useRef(null);

  const tooltipContent = content || text;

  const calculatePosition = () => {
    if (!childRef.current || !tooltipRef.current) return;

    const container = childRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    const MARGIN = 10;
    const ARROW_SIZE = 10;

    let x = 0;
    let y = 0;
    let pos = position;

    // Výpočet pozice podle zadané strany
    if (position === 'top') {
      x = container.left + container.width / 2 - tooltip.width / 2;
      y = container.top - tooltip.height - ARROW_SIZE;
      
      // Kontrola okrajů
      if (y < MARGIN) {
        pos = 'bottom';
        y = container.bottom + ARROW_SIZE;
      }
    } else if (position === 'bottom') {
      x = container.left + container.width / 2 - tooltip.width / 2;
      y = container.bottom + ARROW_SIZE;
      
      if (y + tooltip.height > viewport.height - MARGIN) {
        pos = 'top';
        y = container.top - tooltip.height - ARROW_SIZE;
      }
    } else if (position === 'left') {
      x = container.left - tooltip.width - ARROW_SIZE;
      y = container.top + container.height / 2 - tooltip.height / 2;
      
      if (x < MARGIN) {
        pos = 'right';
        x = container.right + ARROW_SIZE;
      }
    } else { // right
      x = container.right + ARROW_SIZE;
      y = container.top + container.height / 2 - tooltip.height / 2;
      
      if (x + tooltip.width > viewport.width - MARGIN) {
        pos = 'left';
        x = container.left - tooltip.width - ARROW_SIZE;
      }
    }

    // Korekce horizontálních okrajů
    if (x < MARGIN) x = MARGIN;
    if (x + tooltip.width > viewport.width - MARGIN) {
      x = viewport.width - tooltip.width - MARGIN;
    }

    // Korekce vertikálních okrajů
    if (y < MARGIN) y = MARGIN;
    if (y + tooltip.height > viewport.height - MARGIN) {
      y = viewport.height - tooltip.height - MARGIN;
    }

    setTooltipPos({ x: Math.round(x), y: Math.round(y) });
    setFinalPosition(pos);
  };

  const handleMouseEnter = () => {
    if (disabled || !tooltipContent) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Vypočítej pozici po zobrazení
      requestAnimationFrame(() => {
        requestAnimationFrame(calculatePosition);
      });
    }, showDelay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
      
      return () => {
        window.removeEventListener('scroll', calculatePosition, true);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (disabled || !tooltipContent) {
    return <>{children}</>;
  }

  const childElement = React.Children.only(children);
  const enhancedChild = React.cloneElement(childElement, {
    ref: childRef,
    onMouseEnter: (e) => {
      handleMouseEnter();
      if (childElement.props.onMouseEnter) {
        childElement.props.onMouseEnter(e);
      }
    },
    onMouseLeave: (e) => {
      handleMouseLeave();
      if (childElement.props.onMouseLeave) {
        childElement.props.onMouseLeave(e);
      }
    }
  });

  return (
    <>
      {enhancedChild}
      {isVisible && createPortal(
        <TooltipBubble
          ref={tooltipRef}
          $x={tooltipPos.x}
          $y={tooltipPos.y}
          $position={finalPosition}
          $visible={isVisible}
          $multiline={content !== undefined}
        >
          {tooltipContent}
        </TooltipBubble>,
        document.body
      )}
    </>
  );
};

// Export styled komponenty pro zpětnou kompatibilitu (starý způsob použití s .tooltip child elementem)
export { TooltipWrapperStyled };
