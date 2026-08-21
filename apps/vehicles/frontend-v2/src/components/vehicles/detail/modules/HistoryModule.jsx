import React from 'react';
import {
  formatAuditDate,
  getAuditActorLabel,
  getAuditModuleLabel,
  getAuditActionLabel,
  getAuditChangeSummary,
} from '../auditEventUtils';

export default function HistoryModule({
  cardHistory = [],
  cardHistoryLoading,
  cardHistoryError,
}) {
  if (cardHistoryLoading) {
    return <p className="muted">Načítám historii změn...</p>;
  }

  if (cardHistoryError) {
    return <div className="error-box">{cardHistoryError}</div>;
  }

  if (cardHistory.length === 0) {
    return <p className="muted">Žádná historie změn</p>;
  }

  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>Datum a čas</th>
            <th>Kdo upravil</th>
            <th>Modul</th>
            <th>Akce</th>
            <th>Změny</th>
          </tr>
        </thead>
        <tbody>
          {cardHistory.map((entry) => {
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
  );
}
