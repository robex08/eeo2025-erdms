export default function SyncGate({
  syncSeconds = 0,
  eyebrow = 'Aktualizace dat',
  title = 'Průběžně načítám aktuální data',
  description = 'Prosím vyčkejte. Po dokončení se seznam vozidel automaticky obnoví.',
  runtimeLabel = 'Doba běhu',
  showRuntime = true,
  inline = false,
  compact = false,
  progress = null, // např. "Zpracováno 3 z 15 vozidel"
}) {
  const wrapperClass = `sync-gate${inline ? ' sync-gate-inline' : ''}${compact ? ' sync-gate-compact' : ''}`;

  return (
    <div className={wrapperClass} role="status" aria-live="polite" aria-busy="true">
      <div className="sync-gate-card">
        <div className="sync-gate-top">
          <span className="sync-spinner" aria-hidden="true" />
          <div>
            <p className="sync-gate-eyebrow">{eyebrow}</p>
            <h3>{title}</h3>
          </div>
        </div>

        <p className="sync-gate-text">{description}</p>
        
        {progress && (
          <p className="sync-gate-text" style={{ marginTop: '0.5rem', fontWeight: 500 }}>
            {progress}
          </p>
        )}

        {showRuntime ? (
          <div className="sync-gate-meta">
            <span className="sync-runtime-label">{runtimeLabel}</span>
            <strong className="sync-runtime-value">{syncSeconds} s</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}
