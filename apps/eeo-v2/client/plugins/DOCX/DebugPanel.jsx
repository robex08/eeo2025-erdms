
import React, { useRef, useEffect } from "react";

function DebugPanel({ title, xml, style, search }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    if (!search) return;
    // najdi první zvýrazněný span
    const el = containerRef.current.querySelector("span[style*='background:#ffecb3']");
    if (el) {
      const top = el.offsetTop;
      containerRef.current.scrollTop = top - 16;
    }
  }, [xml, search]);
  return (
    <div ref={containerRef} style={{ background: '#1a1c23', color: '#c3e88d', borderRadius: 6, padding: 0, fontFamily: 'Fira Mono,Consolas,monospace', fontSize: 14, minHeight: 350, maxHeight: 600, overflow: 'auto', margin: 0, width: '100%', boxSizing: 'border-box', ...style }}>
      {title && <div style={{ color: '#b2ff59', fontWeight: 600, marginBottom: 8 }}>{title}</div>}
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }} dangerouslySetInnerHTML={{ __html: xml }} />
    </div>
  );
}

export default DebugPanel;
