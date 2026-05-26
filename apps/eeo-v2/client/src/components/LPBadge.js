import React from 'react';
import styled from 'styled-components';

/**
 * LPBadge - Komponenta pro zobrazení LP s barevným označením podle modulu
 * 
 * @param {Object} props
 * @param {string} props.cislo_lp - Kód LP (např. "LPP4")
 * @param {string} props.nazev_uctu - Název účtu LP
 * @param {string} props.modul - Modul použití ("o", "p", "f", "op", "fp", "fop")
 * @param {boolean} [props.showModul] - Zobrazit modul badge (default: true)
 * @param {Function} [props.onRemove] - Callback pro odstranění LP (zobrazí × tlačítko)
 * @param {string} [props.size] - Velikost ("small", "medium", "large") - default: "medium"
 */
const LPBadge = ({ 
  cislo_lp, 
  nazev_uctu, 
  modul = 'op',
  showModul = true,
  onRemove = null,
  size = 'medium'
}) => {
  
  // Mapování modulů na barvy a labely
  const getModulInfo = (modul) => {
    switch (modul) {
      case 'o':
        return { color: '#2196F3', label: 'Objednávky', short: 'O' };
      case 'p':
        return { color: '#FFC107', label: 'Pokladna', short: 'P' };
      case 'f':
        return { color: '#E91E63', label: 'Faktury', short: 'F' };
      case 'op':
        return { color: '#4CAF50', label: 'Objednávky + Pokladna', short: 'O+P' };
      case 'fp':
        return { color: '#9C27B0', label: 'Faktury + Pokladna', short: 'F+P' };
      case 'fop':
        return { color: '#FF5722', label: 'Všechny moduly', short: 'F+O+P' };
      default:
        return { color: '#4CAF50', label: 'Objednávky + Pokladna', short: 'O+P' };
    }
  };

  const modulInfo = getModulInfo(modul);

  return (
    <BadgeContainer size={size}>
      <LPCode size={size}>
        <LPCodeText>{cislo_lp}</LPCodeText>
        {nazev_uctu && (
          <LPName size={size}>{nazev_uctu}</LPName>
        )}
      </LPCode>
      
      {showModul && (
        <ModulBadge color={modulInfo.color} title={modulInfo.label} size={size}>
          {modulInfo.short}
        </ModulBadge>
      )}
      
      {onRemove && (
        <RemoveButton onClick={onRemove} title="Odebrat LP" size={size}>
          ×
        </RemoveButton>
      )}
    </BadgeContainer>
  );
};

// Styled Components
const BadgeContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.size === 'small' ? '4px' : props.size === 'large' ? '10px' : '6px'};
  padding: ${props => props.size === 'small' ? '4px 8px' : props.size === 'large' ? '10px 14px' : '6px 10px'};
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: ${props => props.size === 'small' ? '4px' : props.size === 'large' ? '8px' : '6px'};
  font-size: ${props => props.size === 'small' ? '11px' : props.size === 'large' ? '15px' : '13px'};
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: #eeeeee;
    border-color: #d0d0d0;
  }
`;

const LPCode = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.size === 'small' ? '2px' : '3px'};
`;

const LPCodeText = styled.span`
  color: #333;
  font-weight: 600;
  white-space: nowrap;
`;

const LPName = styled.span`
  color: #666;
  font-size: ${props => props.size === 'small' ? '10px' : props.size === 'large' ? '13px' : '11px'};
  font-weight: 400;
  max-width: ${props => props.size === 'small' ? '120px' : props.size === 'large' ? '250px' : '180px'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ModulBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.size === 'small' ? '2px 6px' : props.size === 'large' ? '4px 10px' : '3px 8px'};
  background: ${props => props.color};
  color: white;
  border-radius: ${props => props.size === 'small' ? '3px' : props.size === 'large' ? '5px' : '4px'};
  font-size: ${props => props.size === 'small' ? '9px' : props.size === 'large' ? '12px' : '10px'};
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: help;
`;

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${props => props.size === 'small' ? '16px' : props.size === 'large' ? '24px' : '20px'};
  height: ${props => props.size === 'small' ? '16px' : props.size === 'large' ? '24px' : '20px'};
  padding: 0;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: ${props => props.size === 'small' ? '14px' : props.size === 'large' ? '20px' : '16px'};
  font-weight: bold;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #d32f2f;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
`;

export default LPBadge;
