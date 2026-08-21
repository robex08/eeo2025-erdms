import AppIcon from '../ui/AppIcon';

export default function OverviewActionButtons({
  loading,
  syncing,
  canResetFilters,
  onResetFilters,
  onReloadFromDb,
  onSyncFromWebDispecink,
}) {
  return (
    <div className="icon-actions">
      <button
        className="icon-action-btn"
        type="button"
        onClick={onResetFilters}
        disabled={!canResetFilters}
        title="Resetovat všechny aktivní filtry"
        aria-label="Resetovat všechny aktivní filtry"
      >
        <AppIcon name="resetFilters" size={20} weight="regular" />
      </button>

      <button
        className="icon-action-btn"
        type="button"
        onClick={onReloadFromDb}
        disabled={loading || syncing}
        title="Obnovit zobrazená data"
        aria-label="Obnovit zobrazená data"
      >
        <AppIcon name="db" size={20} weight="regular" />
      </button>

      <button
        className="icon-action-btn icon-action-btn-primary"
        type="button"
        onClick={onSyncFromWebDispecink}
        disabled={syncing}
        title="Aktualizovat data"
        aria-label="Aktualizovat data"
      >
        <AppIcon name="sync" size={20} weight="regular" />
      </button>
    </div>
  );
}
