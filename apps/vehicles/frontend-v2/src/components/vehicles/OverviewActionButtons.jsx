import AppIcon from '../ui/AppIcon';

export default function OverviewActionButtons({ loading, syncing, onReloadFromDb, onSyncFromWebDispecink }) {
  return (
    <div className="icon-actions">
      <button
        className="icon-action-btn"
        type="button"
        onClick={onReloadFromDb}
        disabled={loading || syncing}
        title="Obnovit data pouze z databáze"
        aria-label="Obnovit data pouze z databáze"
      >
        <AppIcon name="db" size={20} weight="duotone" />
      </button>

      <button
        className="icon-action-btn icon-action-btn-primary"
        type="button"
        onClick={onSyncFromWebDispecink}
        disabled={syncing}
        title="Synchronizovat data z WebDispečinku"
        aria-label="Synchronizovat data z WebDispečinku"
      >
        <AppIcon name="sync" size={20} weight="duotone" />
      </button>
    </div>
  );
}
