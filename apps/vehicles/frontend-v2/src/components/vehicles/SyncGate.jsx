export default function SyncGate({
  syncSeconds = 0,
  eyebrow = 'Aktualizace dat',
  title = 'Průběžně načítám aktuální data',
  description = 'Prosím vyčkejte. Po dokončení se seznam vozidel automaticky obnoví.',
  runtimeLabel = 'Doba běhu',
  showRuntime = true,
  inline = false,
  compact = false,
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
