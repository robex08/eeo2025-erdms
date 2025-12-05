import styled from '@emotion/styled';

/**
 * Globální Tooltip komponenta pro jednotný vzhled napříč celou aplikací
 * Použití: Obalit element s touto komponentou a nastavit .tooltip child
 */
export const TooltipWrapper = styled.div`
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
