export default function SyncGate({ syncSeconds }) {
  return (
    <div className="sync-gate" role="status" aria-live="polite">
      <div className="sync-gate-card">
        <div className="sync-gate-top">
          <span className="sync-spinner" aria-hidden="true" />
          <div>
            <p className="sync-gate-eyebrow">Synchronizace databaze</p>
            <h3>Prubezne nacitam data z WebDispecinku</h3>
          </div>
        </div>

        <p className="sync-gate-text">Prosim vyckejte. Po dokonceni se seznam vozidel automaticky obnovi.</p>

        <div className="sync-gate-meta">
          <span className="sync-runtime-label">Doba behu</span>
          <strong className="sync-runtime-value">{syncSeconds} s</strong>
        </div>
      </div>
    </div>
  );
}
