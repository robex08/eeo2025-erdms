// Komponenta pro zobrazení verze pluginu vpravo v tab baru, zarovnaná na konec řádku s taby
export default function VersionBadge() {
  const version = import.meta.env.VITE_PLUGIN_VERSION || '0.90.0709.2025';
  return (
    <div style={{
      marginLeft: 'auto',
      alignSelf: 'center',
      color: '#b0b0b0',
      fontSize: '0.95em',
      fontFamily: 'monospace',
      background: 'rgba(255,255,255,0.13)',
      padding: '2px 14px 2px 16px',
      borderRadius: '8px 0 0 8px',
      letterSpacing: '0.04em',
      userSelect: 'none',
      minWidth: 80,
      textAlign: 'right',
      height: 32,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
    }}>
      v{version}
    </div>
  );
}
