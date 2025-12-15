/**
 * 🏢 HierarchyBanner - Univerzální komponenta pro zobrazení stavu hierarchie
 * 
 * Použití:
 * <HierarchyBanner module={HierarchyModules.ORDERS} />
 * 
 * @author GitHub Copilot & robex08
 * @date 15. prosince 2025
 */

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import hierarchyService, { HierarchyModules, HierarchyStatus } from '../../services/hierarchyService';

const HierarchyBanner = ({ module = HierarchyModules.ORDERS, compact = false }) => {
  const { token, username } = useContext(AuthContext);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    loadHierarchyConfig();
  }, [token, username, module]);

  const loadHierarchyConfig = async () => {
    // Pokud chybí token nebo username, neděláme nic (user není přihlášen)
    if (!token || !username) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const hierarchyConfig = await hierarchyService.getHierarchyConfigCached(token, username);
      setConfig(hierarchyConfig);
    } catch (error) {
      console.error('❌ [HierarchyBanner] Chyba načítání:', error);
      // V případě chyby se tiše skryjeme (není to critical)
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  // Pokud není hierarchie aktivní nebo je vypnutá, nezobrazujeme nic
  // Tím zajistíme, že vypnutá hierarchie = žádný vliv na UI
  if (loading || !config || config.status === HierarchyStatus.DISABLED) {
    return null;
  }

  const message = hierarchyService.getHierarchyInfoMessage(config, module);
  if (!message || !visible) {
    return null;
  }

  const bannerColor = hierarchyService.getHierarchyBannerColor(config);
  
  // Barvy podle typu
  const colors = {
    info: {
      bg: '#e3f2fd',
      border: '#2196f3',
      text: '#0d47a1',
      icon: '🏢'
    },
    warning: {
      bg: '#fff3e0',
      border: '#ff9800',
      text: '#e65100',
      icon: '⚠️'
    },
    error: {
      bg: '#ffebee',
      border: '#f44336',
      text: '#b71c1c',
      icon: '❌'
    },
    success: {
      bg: '#e8f5e9',
      border: '#4caf50',
      text: '#1b5e20',
      icon: '🛡️'
    }
  };

  const style = colors[bannerColor] || colors.info;

  const bannerStyle = {
    backgroundColor: style.bg,
    borderLeft: `4px solid ${style.border}`,
    color: style.text,
    padding: compact ? '8px 12px' : '12px 16px',
    marginBottom: compact ? '8px' : '16px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: compact ? '12px' : '14px',
    lineHeight: '1.5'
  };

  const iconStyle = {
    marginRight: '8px',
    fontSize: compact ? '16px' : '20px'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: style.text,
    opacity: 0.6,
    padding: '0 4px',
    marginLeft: '12px'
  };

  return (
    <div style={bannerStyle}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={iconStyle}>{style.icon}</span>
        <span>{message}</span>
      </div>
      <button
        style={closeButtonStyle}
        onClick={() => setVisible(false)}
        title="Zavřít"
        onMouseOver={(e) => e.target.style.opacity = 1}
        onMouseOut={(e) => e.target.style.opacity = 0.6}
      >
        ×
      </button>
    </div>
  );
};

export default HierarchyBanner;
