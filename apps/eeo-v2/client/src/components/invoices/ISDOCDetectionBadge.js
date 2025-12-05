import React from 'react';
import styled from '@emotion/styled';
import { FileCheck } from 'lucide-react';

/**
 * ISDOCDetectionBadge Component
 *
 * Zobrazí badge s informací o detekci ISDOC formátu
 * Používá se u přílohy faktury pro rychlou vizuální indikaci
 */

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.detected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e5e7eb'};
  color: ${props => props.detected ? '#ffffff' : '#6b7280'};
  border: 1px solid ${props => props.detected ? '#059669' : '#d1d5db'};
  transition: all 0.2s ease;
  cursor: ${props => props.onClick ? 'pointer' : 'default'};

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    ${props => props.onClick && `
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `}
  }
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const Tooltip = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  z-index: 1000;
  opacity: ${props => props.show ? 1 : 0};
  visibility: ${props => props.show ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #1f2937;
  }
`;

const ISDOCDetectionBadge = ({
  detected = false,
  parsed = false,
  onClick,
  showTooltip = true
}) => {
  const [tooltipVisible, setTooltipVisible] = React.useState(false);

  const getTooltipText = () => {
    if (detected && parsed) {
      return 'ISDOC formát - data extrahována';
    }
    if (detected && !parsed) {
      return 'ISDOC formát - detekován (neparsován)';
    }
    return 'Standardní příloha';
  };

  const getBadgeText = () => {
    if (detected && parsed) {
      return 'ISDOC ✓';
    }
    if (detected && !parsed) {
      return 'ISDOC';
    }
    return 'PDF/IMG';
  };

  const badge = (
    <Badge
      detected={detected}
      onClick={onClick}
      onMouseEnter={() => showTooltip && setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      {detected && <FileCheck />}
      {getBadgeText()}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipWrapper>
      {badge}
      <Tooltip show={tooltipVisible}>
        {getTooltipText()}
      </Tooltip>
    </TooltipWrapper>
  );
};

export default ISDOCDetectionBadge;
