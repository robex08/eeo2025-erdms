import { useState, useEffect, useRef, useCallback } from 'react';

// Hook to encapsulate debug panel sizing, position, font and resizing logic
export function useDebugPanel() {
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugFont, setDebugFont] = useState(20); // default font size

  // panel size persistence
  const getInitialPanelSize = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('debugPanelSize'));
      if (saved && typeof saved.width === 'number' && typeof saved.height === 'number') return saved;
    } catch {}
    const w = Math.round(window.innerWidth * 0.40);
    const h = Math.round(window.innerHeight * 0.35);
    return { width: Math.max(260, w), height: Math.max(160, h) };
  };
  const [panelSize, setPanelSize] = useState(getInitialPanelSize);
  const [panelPos, setPanelPos] = useState({ left: 16, top: 120 });
  const resizingRef = useRef(null); // {mode,startX,startY,startW,startH,startLeft,startTop}

  const onMouseMove = useCallback((e) => {
    if (!resizingRef.current) return;
    const r = resizingRef.current;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    if (r.mode === 'move') {
      setPanelPos({
        left: Math.max(4, Math.min(window.innerWidth - 100, r.startLeft + dx)),
        top: Math.max(60, Math.min(window.innerHeight - 60, r.startTop + dy))
      });
    } else {
      let newW = r.startW;
      let newH = r.startH;
      let newLeft = r.startLeft;
      let newTop = r.startTop;
      if (r.mode.includes('right')) newW = Math.max(220, r.startW + dx);
      if (r.mode.includes('bottom')) newH = Math.max(120, r.startH + dy);
      if (r.mode.includes('left')) {
        newW = Math.max(220, r.startW - dx);
        newLeft = Math.max(4, r.startLeft + dx);
      }
      if (r.mode.includes('top')) {
        newH = Math.max(120, r.startH - dy);
        newTop = Math.max(60, r.startTop + dy);
      }
      if (newLeft + newW > window.innerWidth - 8) newW = Math.max(220, window.innerWidth - 8 - newLeft);
      if (newTop + newH > window.innerHeight - 8) newH = Math.max(120, window.innerHeight - 8 - newTop);
      setPanelSize({ width: newW, height: newH });
      setPanelPos({ left: newLeft, top: newTop });
    }
  }, []);

  // Global mouseup/mouseleave cleanup so panel nezůstane "přilepený" při uvolnění tlačítka mimo okno
  useEffect(() => {
    const handleUp = () => {
      if (resizingRef.current) {
        resizingRef.current = null;
        window.removeEventListener('mousemove', onMouseMove);
      }
    };
    const handleLeave = (e) => {
      // Pokud myš opustí document (např. ALT-TAB) a tlačítko už není stisknuté, ukonči režim
      if (e.relatedTarget == null) handleUp();
    };
    window.addEventListener('mouseup', handleUp, true);
    window.addEventListener('mouseleave', handleLeave, true);
    return () => {
      window.removeEventListener('mouseup', handleUp, true);
      window.removeEventListener('mouseleave', handleLeave, true);
    };
  }, [onMouseMove]);

  useEffect(() => {
    try { localStorage.setItem('debugPanelSize', JSON.stringify(panelSize)); } catch {}
  }, [panelSize]);

  const beginResize = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();
    // Pokud už nějaký resize běží, nejdřív ukonči (prevence dvojitého listeneru)
    if (resizingRef.current) {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
    }
    resizingRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startW: panelSize.width,
      startH: panelSize.height,
      startLeft: panelPos.left,
      startTop: panelPos.top,
    };
    window.addEventListener('mousemove', onMouseMove, { passive: false });
  };

  const headerMouseDown = (e) => {
    if (e.target.closest('button')) return; // ignore drags on buttons
    beginResize(e, 'move');
  };

  const resetPanel = () => {
    try { localStorage.removeItem('debugPanelSize'); } catch {}
    const fresh = getInitialPanelSize();
    setPanelSize(fresh);
    setDebugFont(20);
  };

  return {
    debugOpen, setDebugOpen,
    debugFont, setDebugFont,
    panelSize, panelPos, setPanelPos, beginResize, headerMouseDown, resetPanel
  };
}
