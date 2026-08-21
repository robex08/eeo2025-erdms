import { useEffect, useMemo, useRef } from 'react';
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

function parseCardExpirationDate(value) {
  const normalized = String(value || '').trim();
  if (normalized === '') {
    return null;
  }

  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoDateTimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (isoDateTimeMatch) {
    const [, year, month, day, hour, minute, second = '00'] = isoDateTimeMatch;
    const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const czMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (czMatch) {
    const [, day, month, year] = czMatch;
    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');
    const parsed = new Date(`${year}-${paddedMonth}-${paddedDay}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(normalized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatCardExpirationCs(value) {
  const parsed = parseCardExpirationDate(value);
  if (!parsed) {
    return String(value || '').trim();
  }

  return parsed.toLocaleDateString('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getCardExpirationStatus(expirationValue) {
  const expirationDate = parseCardExpirationDate(expirationValue);
  if (!expirationDate) {
    return 'missing-date';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threshold = new Date(today);
  threshold.setMonth(threshold.getMonth() + 3);

  expirationDate.setHours(0, 0, 0, 0);

  if (expirationDate.getTime() < today.getTime()) {
    return 'expired';
  }

  if (expirationDate.getTime() <= threshold.getTime()) {
    return 'expiring';
  }

  return 'valid';
}

function getCcsIndicatorColor(status) {
  const colors = {
    empty: 'var(--ink-soft)',
    'missing-date': '#9ca3af',
    valid: '#16a34a',
    expiring: '#ea580c',
    expired: '#dc2626',
  };

  return colors[status] || colors.empty;
}

function getCcsIndicatorIcon(status) {
  if (status === 'valid') {
    return { name: 'approve', weight: 'fill' };
  }

  if (status === 'expiring' || status === 'expired') {
    return { name: 'warning', weight: 'fill' };
  }

  return { name: 'ccsCard', weight: 'regular' };
}

function getCcsIndicatorTitle(cardNumber, expirationValue, status) {
  const expirationLabel = expirationValue !== '' ? formatCardExpirationCs(expirationValue) : '';

  if (status === 'missing-date') {
    return `CCS karta ${cardNumber}, datum platnosti není vyplněno`;
  }

  if (status === 'expired') {
    return `CCS karta ${cardNumber}, po splatnosti od ${expirationLabel}`;
  }

  if (status === 'expiring') {
    return `CCS karta ${cardNumber}, platnost brzy končí ${expirationLabel}`;
  }

  return `CCS karta ${cardNumber}, platnost do ${expirationLabel}`;
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

function parseServiceContext(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === 'object') {
    return rawValue;
  }

  try {
    const parsed = JSON.parse(String(rawValue));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function resolveEffectiveLocationState(locationStateRaw, manualLocationStateRaw) {
  const base = String(locationStateRaw || '').trim().toLowerCase();
  const manual = String(manualLocationStateRaw || '').trim().toLowerCase();

  if (manual === 'doma' || manual === 'v_akci' || manual === 'v_servisu' || manual === 'nezname') {
    return manual;
  }

  return base;
}

function getServiceMeta(effectiveLocationStateRaw, manualLocationStateRaw, serviceAddressRaw, serviceContextRaw) {
  const state = String(effectiveLocationStateRaw || '').trim().toLowerCase();
  const manualState = String(manualLocationStateRaw || '').trim().toLowerCase();
  const serviceAddress = String(serviceAddressRaw || '').trim();
  const atService = state === 'v_servisu';
  const isManualService = manualState === 'v_servisu';
  const serviceContext = parseServiceContext(serviceContextRaw);

  const contextName = String(serviceContext.name || serviceContext.service_name || serviceContext.serviceName || '').trim();
  const contextAddress = String(serviceContext.address || serviceContext.service_address || serviceContext.serviceAddress || '').trim();
  const contextContact = String(serviceContext.contact || serviceContext.service_contact || serviceContext.serviceContact || '').trim();
  const contextNote = String(serviceContext.note || serviceContext.service_note || serviceContext.serviceNote || '').trim();

  const manualParts = [contextName, contextAddress, contextContact, contextNote].filter((value) => value !== '');
  const manualInfo = manualParts.join(' | ');

  if (atService) {
    if (isManualService) {
      return {
        code: 'Sr',
        tone: 'active',
        label: manualInfo !== ''
          ? `Sr - V servisu (manuální zadání): ${manualInfo}`
          : (serviceAddress !== '' ? `Sr - V servisu (manuální zadání): ${serviceAddress}` : 'Sr - V servisu (manuální zadání, detail není dostupný)'),
      };
    }

    return {
      code: 'Sa',
      tone: 'active',
      label: serviceAddress
        ? `Sa - V servisu (automaticky): ${serviceAddress}`
        : 'Sa - V servisu (automaticky, adresa servisu není dostupná)',
    };
  }

  return {
    code: 'N',
    tone: 'inactive',
    label: 'N - Není v servisu',
  };
}

export default function VehiclesTable({
  items,
  sortField,
  sortDirection,
  onSortChange,
  showSelectionColumn = false,
  selectedRowKeys = [],
  onToggleRowSelection,
  onTogglePageSelection,
  onOpenVehicleDetail,
  onMarkVehicleInService,
  onCancelVehicleService,
  onSetVehicleStatusActive,
  onSetVehicleStatusInactive,
  canEditVehicleCard = true,
  onShowEeoHistory,
}) {
  const pageSelectAllRef = useRef(null);
  const selectedSet = useMemo(() => new Set(selectedRowKeys.map((key) => String(key))), [selectedRowKeys]);

  const pageVehicleKeys = useMemo(() => {
    return items
      .map((item) => {
        const key = item?.id;
        if (key === null || key === undefined || key === '') {
          return null;
        }
        return String(key);
      })
      .filter((value) => value !== null);
  }, [items]);

  const selectedOnPageCount = useMemo(() => {
    return pageVehicleKeys.filter((key) => selectedSet.has(key)).length;
  }, [pageVehicleKeys, selectedSet]);

  const allPageSelected = pageVehicleKeys.length > 0 && selectedOnPageCount === pageVehicleKeys.length;
  const somePageSelected = selectedOnPageCount > 0 && !allPageSelected;

  useEffect(() => {
    if (!pageSelectAllRef.current) {
      return;
    }

    pageSelectAllRef.current.indeterminate = somePageSelected;
  }, [somePageSelected]);

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
      <table className={showSelectionColumn ? 'table-has-selection' : ''}>
        <thead>
          <tr>
            {showSelectionColumn ? (
              <th className="table-col-select" scope="col">
                <input
                  ref={pageSelectAllRef}
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={(event) => onTogglePageSelection?.(event.target.checked)}
                  disabled={pageVehicleKeys.length === 0}
                  aria-label="Vybrat všechna vozidla na stránce"
                />
              </th>
            ) : null}
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
            <SortableHeader field="eeo_service_count" label="EEO" className="table-col-eeo" />
            <SortableHeader field="location_state" label="Servis" className="table-col-service" />
            <SortableHeader field="dotace" label="Dotace" className="table-col-dotace" />
            <SortableHeader field="status" label="Stav" className="table-col-status" />
            <SortableHeader field="has_ccs" label="CCS" className="table-col-ccs" />
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
            const manualLocationStateRaw = String(item.manual_location_state || '').toLowerCase();
            const effectiveLocationStateRaw = resolveEffectiveLocationState(locationStateRaw, manualLocationStateRaw);
            const vehicleStatusRaw = String(item.status || '').trim().toLowerCase();
            const manufacturer = normalizeCellValue(item.w_tovarni_znacka);
            const model = normalizeCellValue(item.w_model_vozu);
            const fuelType = normalizeCellValue(item.w_typ_phm);
            const datumZarazeni = formatDateCs(item.datum_zarazeni);
            const najetoKm = formatMileageCs(item.najeto_km);
            const mileageBand = getMileageBand(item.najeto_km);
            const statusMeta = getStatusMeta(item.status);
            const dotaceMeta = getDotaceMeta(item.dotace);
            const serviceMeta = getServiceMeta(
              effectiveLocationStateRaw,
              manualLocationStateRaw,
              item.pos_ln || item.w_stanoviste,
              item.service_context_json
            );
            const ccsCardNumber = String(item.ccs_card_number || '').trim();
            const ccsCardExpiration = String(item.ccs_card_expiration || '').trim();
            const hasCcsCard = ccsCardNumber !== '';
            const ccsExpirationLabel = ccsCardExpiration !== '' ? formatCardExpirationCs(ccsCardExpiration) : '';
            const ccsIndicatorTone = hasCcsCard ? getCardExpirationStatus(ccsCardExpiration) : 'empty';
            const ccsIndicatorTitle = hasCcsCard ? getCcsIndicatorTitle(ccsCardNumber, ccsCardExpiration, ccsIndicatorTone) : '';
            const ccsIndicatorColor = getCcsIndicatorColor(ccsIndicatorTone);
            const ccsIndicatorIcon = getCcsIndicatorIcon(ccsIndicatorTone);

            const rowClasses = [];
            if (effectiveLocationStateRaw === 'v_akci') {
              rowClasses.push('table-row-v-akci');
            } else if (effectiveLocationStateRaw === 'doma') {
              rowClasses.push('table-row-doma');
            } else if (effectiveLocationStateRaw === 'v_servisu') {
              rowClasses.push('table-row-v-servisu');
            }

            if (ccsIndicatorTone === 'expiring') {
              rowClasses.push('table-row-ccs-expiring');
            }

            if (ccsIndicatorTone === 'expired') {
              rowClasses.push('table-row-ccs-expired');
            }

            const rowClassName = rowClasses.join(' ');

            const rowKey = item.id;
            const normalizedRowKey = rowKey !== null && rowKey !== undefined && rowKey !== '' ? String(rowKey) : null;
            const isSelected = normalizedRowKey ? selectedSet.has(normalizedRowKey) : false;

            return (
              <tr key={item.spz || item.id || index} className={rowClassName}>
              {showSelectionColumn ? (
                <td className="table-cell-select">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!normalizedRowKey}
                    onChange={(event) => {
                      if (!normalizedRowKey) {
                        return;
                      }
                      onToggleRowSelection?.(normalizedRowKey, event.target.checked);
                    }}
                    aria-label={`Vybrat vozidlo ${item.spz || item.w_popis || item.id || ''}`}
                  />
                </td>
              ) : null}
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
              <td className="table-cell-eeo">
                {(() => {
                  const count = Number(item?.eeo_service_count || 0);
                  
                  if (typeof onShowEeoHistory === 'function' && count > 0) {
                    return (
                      <button
                        type="button"
                        className="table-eeo-count-btn"
                        title={`Zobrazit ${count} servisních objednávek z EEO`}
                        onClick={() => onShowEeoHistory(item)}
                      >
                        {count}
                      </button>
                    );
                  }
                  
                  return <span className="table-eeo-empty">-</span>;
                })()}
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
              <td className="table-cell-ccs">
                {hasCcsCard ? (
                  <span
                    className={`table-ccs-indicator table-ccs-indicator-${ccsIndicatorTone}`}
                    title={ccsIndicatorTitle}
                    aria-label={ccsIndicatorTitle}
                    style={{ color: ccsIndicatorColor }}
                  >
                    <AppIcon
                      name={ccsIndicatorIcon.name}
                      size={18}
                      weight={ccsIndicatorIcon.weight}
                      color={ccsIndicatorColor}
                    />
                  </span>
                ) : (
                  <span className="table-ccs-empty">-</span>
                )}
              </td>
              <td className="table-cell-actions">
                {item.id ? (
                  <div className="table-action-icons">
                    {/* 1) Náhled: detail vozidla */}
                    {typeof onOpenVehicleDetail === 'function' ? (
                      <button
                        type="button"
                        className="table-icon-btn"
                        title="Detail vozidla"
                        aria-label="Detail vozidla"
                        onClick={() => onOpenVehicleDetail(item)}
                      >
                        <AppIcon name="detail" size={14} weight="duotone" />
                      </button>
                    ) : (
                      <Link
                        className="table-icon-btn"
                        to={`/vehicles/${item.id}`}
                        title="Detail vozidla"
                        aria-label="Detail vozidla"
                      >
                        <AppIcon name="detail" size={14} weight="duotone" />
                      </Link>
                    )}

                    {/* 2) Editace: hlavní karta a její rychlé sekce */}
                    {canEditVehicleCard ? (
                      <>
                        <Link
                          className="table-icon-btn table-icon-btn-primary"
                          to={`/vehicles/${item.id}#karta`}
                          title="Editace karty vozidla"
                          aria-label="Editace karty vozidla"
                        >
                          <AppIcon name="edit" size={14} weight="duotone" />
                        </Link>
                        <Link
                          className="table-icon-btn"
                          to={`/vehicles/${item.id}?tab=service#karta`}
                          title="Rychlá editace servisních záznamů"
                          aria-label="Rychlá editace servisních záznamů"
                        >
                          <AppIcon name="serviceRecords" size={14} weight="duotone" />
                        </Link>
                        <Link
                          className="table-icon-btn"
                          to={`/vehicles/${item.id}?tab=insurance#karta`}
                          title="Rychlá editace pojištění a škod"
                          aria-label="Rychlá editace pojištění a škod"
                        >
                          <AppIcon name="ccsCard" size={14} weight="duotone" />
                        </Link>
                      </>
                    ) : null}

                    {/* 3) Stav vozidla: aktivace/deaktivace */}
                    {vehicleStatusRaw === 'vyrazene' && typeof onSetVehicleStatusActive === 'function' ? (
                      <button
                        type="button"
                        className="table-icon-btn table-icon-btn-disabled"
                        title="Vyřazené vozidlo nelze změnit stavem"
                        aria-label="Vyřazené vozidlo nelze změnit stavem"
                        disabled
                      >
                        <AppIcon name="lock" size={14} weight="duotone" />
                      </button>
                    ) : null}

                    {vehicleStatusRaw === 'aktivni' && typeof onSetVehicleStatusInactive === 'function' ? (
                      <button
                        type="button"
                        className="table-icon-btn table-icon-btn-danger"
                        title="Označit vozidlo jako neaktivní"
                        aria-label="Označit vozidlo jako neaktivní"
                        onClick={() => onSetVehicleStatusInactive?.(item)}
                      >
                        <AppIcon name="lock" size={14} weight="duotone" />
                      </button>
                    ) : null}

                    {vehicleStatusRaw === 'neaktivni' && typeof onSetVehicleStatusActive === 'function' ? (
                      <button
                        type="button"
                        className="table-icon-btn table-icon-btn-success"
                        title="Označit vozidlo jako aktivní"
                        aria-label="Označit vozidlo jako aktivní"
                        onClick={() => onSetVehicleStatusActive?.(item)}
                      >
                        <AppIcon name="unlock" size={14} weight="duotone" />
                      </button>
                    ) : null}

                    {/* 4) Servis vozidla: zařazení/vyřazení ze servisu */}
                    {typeof onCancelVehicleService === 'function' && effectiveLocationStateRaw === 'v_servisu' ? (
                      <button
                        type="button"
                        className="table-icon-btn table-icon-btn-success"
                        title="Zrušit servis u vozidla"
                        aria-label="Zrušit servis u vozidla"
                        onClick={() => onCancelVehicleService?.(item)}
                      >
                        <AppIcon name="approve" size={14} weight="duotone" />
                      </button>
                    ) : null}

                    {typeof onMarkVehicleInService === 'function' && effectiveLocationStateRaw !== 'v_servisu' ? (
                      <button
                        type="button"
                        className="table-icon-btn table-icon-btn-service"
                        title="Označit vozidlo do servisu"
                        aria-label="Označit vozidlo do servisu"
                        onClick={() => onMarkVehicleInService?.(item)}
                      >
                        <AppIcon name="service" size={14} weight="duotone" />
                      </button>
                    ) : null}

                    {/* 5) Navigace: poloha vozidla na mapě */}
                    <Link
                      className="table-icon-btn"
                      to="/map"
                      onClick={() => prepareMapFiltersForVehicle(item)}
                      title="Zobrazit vozidlo na mapě"
                      aria-label="Zobrazit vozidlo na mapě"
                    >
                      <AppIcon name="mapLocate" size={14} weight="duotone" />
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
