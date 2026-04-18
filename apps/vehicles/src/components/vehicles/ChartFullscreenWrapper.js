import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import './ChartFullscreenWrapper.css';

export default function ChartFullscreenWrapper({ children, title, extraButtons }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const overlayRef = useRef(null);

  const openFullscreen = useCallback(() => setIsFullscreen(true), []);
  const closeFullscreen = useCallback(() => setIsFullscreen(false), []);

  // Escape klávesa pro zavření
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKey = e => {
      if (e.key === 'Escape') closeFullscreen();
    };
    document.addEventListener('keydown', handleKey);
    // Zablokovat scroll na body
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, closeFullscreen]);

  // Support render prop (children as function) or regular children
  const renderChildren = (fs) => {
    if (typeof children === 'function') return children(fs);
    return children;
  };

  return (
    <div className="chart-fs-wrapper">
      <div className="chart-fs-toolbar">
        {extraButtons}
        <button
          className="chart-fs-btn"
          onClick={openFullscreen}
          title="Zobrazit na celou obrazovku"
          type="button"
        >
          <MdFullscreen />
        </button>
      </div>
      {renderChildren(false)}
      {isFullscreen && (
        <div className="chart-fs-overlay" ref={overlayRef} onClick={e => {
          if (e.target === overlayRef.current) closeFullscreen();
        }}>
          <div className="chart-fs-overlay-content">
            <div className="chart-fs-overlay-header">
              {title && <span className="chart-fs-overlay-title">{title}</span>}
              <button
                className="chart-fs-close-btn"
                onClick={closeFullscreen}
                title="Zavřít fullscreen (Esc)"
                type="button"
              >
                <MdFullscreenExit />
              </button>
            </div>
            <div className="chart-fs-overlay-body">
              {renderChildren(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
