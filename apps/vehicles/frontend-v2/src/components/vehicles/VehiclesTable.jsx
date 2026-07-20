import { Link } from 'react-router-dom';
import AppIcon from '../ui/AppIcon';

const MAP_FILTERS_STORAGE_KEY = 'vehicles_v2_map_filters';

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

function formatDateCs(value) {
  if (!value) return 'Nezadáno';

  const normalized = String(value).replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatMileageCs(value) {
  const km = Number(value);
  if (!Number.isFinite(km) || km <= 0) {
    return 'Nezadáno';
  }

  return `${Math.round(km).toLocaleString('cs-CZ')} km`;
}

function getMileageBand(kmValue) {
  const km = Number(kmValue);
  if (!Number.isFinite(km) || km <= 0) {
    return null;
  }

  if (km >= 500000) return { key: '500k', label: '500K+' };
  if (km >= 400000) return { key: '400k', label: '400K+' };
  if (km >= 300000) return { key: '300k', label: '300K+' };
  if (km >= 250000) return { key: '250k', label: '250K+' };
  if (km >= 200000) return { key: '200k', label: '200K+' };
  if (km >= 100000) return { key: '100k', label: '100K+' };

  return { key: '0k', label: '0K+' };
}

function getStatusMeta(rawStatus) {
  const value = String(rawStatus || '').trim().toLowerCase();

  if (value === 'aktivni') {
    return { code: 'A', label: 'Aktivní', tone: 'active' };
  }

  if (value === 'vyrazene') {
    return { code: 'V', label: 'Vyřazené', tone: 'retired' };
  }

  if (value === 'neaktivni') {
    return { code: 'N', label: 'Neaktivní', tone: 'inactive' };
  }

  if (value === '') {
    return { code: '-', label: 'Neznámé', tone: 'unknown' };
  }

  return { code: '?', label: rawStatus, tone: 'unknown' };
}

function formatDotace(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  return normalized.toUpperCase();
}

function getDotaceMeta(rawDotace) {
  const code = formatDotace(rawDotace);
  if (code === 'A') {
    return { code: 'A', label: 'Dotace: A', tone: 'active' };
  }

  if (code === '') {
    return { code: '-', label: 'Dotace: nezadáno', tone: 'unknown' };
  }

  return { code, label: `Dotace: ${code}`, tone: 'other' };
}

function getServiceMeta(locationStateRaw, serviceAddressRaw) {
  const state = String(locationStateRaw || '').trim().toLowerCase();
  const serviceAddress = String(serviceAddressRaw || '').trim();
  const atService = state === 'v_servisu';

  if (atService) {
    return {
      code: 'A',
      tone: 'active',
      label: serviceAddress
        ? `V servisu: ${serviceAddress}`
        : 'V servisu (adresa servisu není dostupná)',
    };
  }

  return {
    code: 'N',
    tone: 'inactive',
    label: 'Není v servisu',
  };
}

export default function VehiclesTable({ items, sortField, sortDirection, onSortChange }) {
  function normalizeCellValue(rawValue) {
    const normalized = String(rawValue || '').trim();
    if (
      normalized === ''
      || normalized === '--'
      || normalized.toLowerCase() === 'null'
      || normalized.toLowerCase() === '-- prazdne'
      || normalized.toLowerCase() === '-- prázdné'
      || normalized.toLowerCase() === 'prazdne'
      || normalized.toLowerCase() === 'prázdné'
    ) {
      return 'Nezadáno';
    }

    return normalized;
  }

  function renderSortIcon(field) {
    if (sortField !== field) {
      return <AppIcon name="sort" size={14} />;
    }

    return <AppIcon name={sortDirection === 'asc' ? 'sortAsc' : 'sortDesc'} size={14} />;
  }

  function SortableHeader({ field, label, className = '' }) {
    const isActive = sortField === field;
    const ariaSort = isActive ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';

    return (
      <th aria-sort={ariaSort} className={className}>
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

  function prepareMapFiltersForVehicle(item, searchOverride = '') {
    if (typeof window === 'undefined') {
      return;
    }

    const spz = String(item?.spz || '').trim();
    const callSign = String(item?.w_popis || '').trim();
    const nextSearch = String(searchOverride || spz || callSign).trim();

    if (!nextSearch) {
      return;
    }

    let parsed = {};
    try {
      const raw = localStorage.getItem(MAP_FILTERS_STORAGE_KEY);
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      parsed = {};
    }

    localStorage.setItem(
      MAP_FILTERS_STORAGE_KEY,
      JSON.stringify({
        ...parsed,
        search: nextSearch,
        showVehicles: true,
        statusFilter: 'all',
      })
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortableHeader field="spz" label="SPZ" />
            <SortableHeader field="w_popis" label="Volací znak" />
            <SortableHeader field="zzs_typ" label="Typ" />
            <SortableHeader field="w_tovarni_znacka" label="Výrobce" />
            <SortableHeader field="w_model_vozu" label="Model" />
            <SortableHeader field="w_typ_phm" label="Palivo" />
            <SortableHeader field="w_stanoviste" label="Místo" />
            <SortableHeader field="w_groupname" label="Skupina" />
            <SortableHeader field="datum_zarazeni" label="Datum zařazení" className="table-col-date" />
            <SortableHeader field="najeto_km" label="Najeté km" className="table-col-km" />
            <SortableHeader field="last_update" label="Poslední aktualizace" className="table-col-last-update" />
            <th className="table-col-service">Servis</th>
            <SortableHeader field="dotace" label="Dotace" className="table-col-dotace" />
            <SortableHeader field="status" label="Stav" className="table-col-status" />
            <th className="table-col-actions">Akce</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const vehicleType = normalizeCellValue(item.zzs_typ);
            const callSign = normalizeCellValue(item.w_popis);
            const location = normalizeCellValue(item.w_groupname);
            const station = normalizeCellValue(item.w_stanoviste);
            const locationStateRaw = String(item.location_state || '').toLowerCase();
            const manufacturer = normalizeCellValue(item.w_tovarni_znacka);
            const model = normalizeCellValue(item.w_model_vozu);
            const fuelType = normalizeCellValue(item.w_typ_phm);
            const datumZarazeni = formatDateCs(item.datum_zarazeni);
            const najetoKm = formatMileageCs(item.najeto_km);
            const mileageBand = getMileageBand(item.najeto_km);
            const statusMeta = getStatusMeta(item.status);
            const dotaceMeta = getDotaceMeta(item.dotace);
              const serviceMeta = getServiceMeta(
                item.location_state,
                item.pos_ln || item.w_stanoviste
              );
            let rowClassName = '';
            if (locationStateRaw === 'v_akci') {
              rowClassName = 'table-row-v-akci';
            } else if (locationStateRaw === 'doma') {
              rowClassName = 'table-row-doma';
            } else if (locationStateRaw === 'v_servisu') {
              rowClassName = 'table-row-v-servisu';
            }

            return (
              <tr key={item.id || item.spz} className={rowClassName}>
              <td>{item.spz}</td>
              <td>{callSign}</td>
              <td>{vehicleType}</td>
              <td>{manufacturer}</td>
              <td>{model}</td>
              <td>{fuelType}</td>
              <td>{station}</td>
              <td>{location}</td>
              <td className="table-cell-date-centered">
                <span className="table-cell-date-inner">{datumZarazeni}</span>
              </td>
              <td className="table-cell-km-right">
                {mileageBand ? (
                  <span className={`table-mileage-badge table-mileage-badge-${mileageBand.key}`} title={`Pásmo ${mileageBand.label}`}>
                    {najetoKm}
                  </span>
                ) : (
                  <span>{najetoKm}</span>
                )}
              </td>
              <td className="table-cell-last-update">
                <span className="table-cell-last-update-inner">{formatDateTimeCs(item.last_update)}</span>
              </td>
              <td className="table-cell-service">
                <span className="table-status-wrap" title={serviceMeta.label} aria-label={serviceMeta.label}>
                  <span className={`table-service-chip table-service-chip-${serviceMeta.tone}`}>{serviceMeta.code}</span>
                </span>
              </td>
              <td className="table-cell-dotace">
                <span className="table-status-wrap" title={dotaceMeta.label} aria-label={dotaceMeta.label}>
                  <span className={`table-dotace-chip table-dotace-chip-${dotaceMeta.tone}`}>{dotaceMeta.code}</span>
                </span>
              </td>
              <td className="table-cell-status">
                <span className="table-status-wrap" title={statusMeta.label} aria-label={`Status: ${statusMeta.label}`}>
                  <span className={`table-status-chip table-status-chip-${statusMeta.tone}`}>{statusMeta.code}</span>
                </span>
              </td>
              <td className="table-cell-actions">
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
                      className="table-icon-btn"
                      to="/map"
                      onClick={() => prepareMapFiltersForVehicle(item)}
                      title="Zobrazit vozidlo na mapě"
                      aria-label="Zobrazit vozidlo na mapě"
                    >
                      <AppIcon name="mapLocate" size={14} weight="duotone" />
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
