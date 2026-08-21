import React from 'react';
import {
  formatAuditDate,
  getAuditActorLabel,
  getAuditModuleLabel,
  getAuditActionLabel,
  getAuditChangeSummary,
} from './auditEventUtils';

const RECENT_EVENTS_LIMIT = 8;

export default function VehicleRecentEventsCard({
  cardHistory = [],
  cardHistoryLoading = false,
  cardHistoryError = '',
  onShowAll,
}) {
  return (
    <article className="info-card vehicle-recent-events-card">
      <div className="vehicle-form-header">
        <div>
          <span className="lookup-section-label">POSLEDNÍ UDÁLOSTI</span>
          <p className="muted">Nejnovější změny napříč kartou vozidla</p>
        </div>
        {cardHistory.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onShowAll}>
            Zobrazit vše
          </button>
        )}
      </div>

      {cardHistoryLoading ? (
        <p className="muted">Načítám poslední události...</p>
      ) : cardHistoryError ? (
        <div className="error-box">{cardHistoryError}</div>
      ) : cardHistory.length === 0 ? (
        <p className="muted">Zatím žádné zaznamenané události</p>
      ) : (
        <div className="data-table vehicle-recent-events-table">
          <table>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Kdo upravil</th>
                <th>Modul</th>
                <th>Akce</th>
                <th>Změny</th>
              </tr>
            </thead>
            <tbody>
              {cardHistory.slice(0, RECENT_EVENTS_LIMIT).map((entry) => {
                const { summary, json } = getAuditChangeSummary(entry);
                return (
                  <tr key={entry.id}>
                    <td>{formatAuditDate(entry.occurred_at)}</td>
                    <td>{getAuditActorLabel(entry)}</td>
                    <td>{getAuditModuleLabel(entry)}</td>
                    <td>{getAuditActionLabel(entry)}</td>
                    <td>
                      {summary || json ? (
                        <details>
                          <summary style={{ cursor: 'pointer' }}>{summary || 'Zobrazit změny'}</summary>
                          {json ? (
                            <pre style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{json}</pre>
                          ) : null}
                        </details>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
