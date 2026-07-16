import { Link } from 'react-router-dom';
import AppIcon from '../ui/AppIcon';

function formatDateTimeCs(value) {
  if (!value) return '-';

  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusMeta(rawStatus) {
  const value = String(rawStatus || '').trim().toLowerCase();

  if (value === 'aktivni') {
    return { code: 'A', label: 'Aktivni', tone: 'active' };
  }

  if (value === 'vyrazene') {
    return { code: 'V', label: 'Vyrazene', tone: 'retired' };
  }

  if (value === 'neaktivni') {
    return { code: 'N', label: 'Neaktivni', tone: 'inactive' };
  }

  if (value === '') {
    return { code: '-', label: 'Nezname', tone: 'unknown' };
  }

  return { code: '?', label: rawStatus, tone: 'unknown' };
}

export default function VehiclesTable({ items, sortField, sortDirection, onSortChange }) {

  function renderSortIcon(field) {
    if (sortField !== field) {
      return <AppIcon name="sort" size={14} />;
    }

    return <AppIcon name={sortDirection === 'asc' ? 'sortAsc' : 'sortDesc'} size={14} />;
  }

  function SortableHeader({ field, label }) {
    const isActive = sortField === field;
    const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <th aria-sort={ariaSort}>
        <button
          className={`table-sort-btn${isActive ? ' is-active' : ''}`}
          type="button"
          onClick={() => onSortChange(field)}
        >
          <span>{label}</span>
          {renderSortIcon(field)}
        </button>
      </th>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortableHeader field="spz" label="SPZ" />
            <SortableHeader field="zzs_typ" label="Typ" />
            <SortableHeader field="w_popis" label="Popis" />
            <SortableHeader field="w_tovarni_znacka" label="Výrobce" />
            <SortableHeader field="w_model_vozu" label="Model" />
            <SortableHeader field="w_typ_phm" label="Palivo" />
            <SortableHeader field="last_update" label="Poslední aktualizace" />
            <SortableHeader field="status" label="Status" />
            <th>Akce</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const manufacturer = item.w_tovarni_znacka || '-';
            const model = item.w_model_vozu || '-';
            const fuelType = item.w_typ_phm || '-';
            const popis = item.w_popis || '-';
            const statusMeta = getStatusMeta(item.status);

            return (
              <tr key={item.id || item.spz}>
              <td>{item.spz}</td>
              <td>{item.zzs_typ || '-'}</td>
              <td>{popis}</td>
              <td>{manufacturer}</td>
              <td>{model}</td>
              <td>{fuelType}</td>
              <td>{formatDateTimeCs(item.last_update)}</td>
              <td>
                <span className="table-status-wrap" title={statusMeta.label} aria-label={`Status: ${statusMeta.label}`}>
                  <span className={`table-status-chip table-status-chip-${statusMeta.tone}`}>{statusMeta.code}</span>
                </span>
              </td>
              <td>
                {item.id ? (
                  <div className="table-action-icons">
                    <Link
                      className="table-icon-btn"
                      to={`/vehicles/${item.id}`}
                      title="Detail vozidla"
                      aria-label="Detail vozidla"
                    >
                      <AppIcon name="detail" size={14} weight="duotone" />
                    </Link>
                    <Link
                      className="table-icon-btn table-icon-btn-primary"
                      to={`/vehicles/${item.id}#karta`}
                      title="Editace karty vozidla"
                      aria-label="Editace karty vozidla"
                    >
                      <AppIcon name="edit" size={14} weight="duotone" />
                    </Link>
                  </div>
                ) : (
                  '-'
                )}
              </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
