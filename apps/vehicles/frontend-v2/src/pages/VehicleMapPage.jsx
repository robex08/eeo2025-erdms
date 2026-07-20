import { useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from '../components/ui/AppIcon';
import SyncGate from '../components/vehicles/SyncGate';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@phosphor-icons/web/regular';
import { fetchDashboardMetrics, fetchStationAddresses, fetchVehicleServiceHistory, fetchVehicles, triggerQuickSync } from '../services/apiClient';
import useDebouncedValue from '../hooks/useDebouncedValue';

const MAP_CENTER = [49.95, 14.6];
const MAP_ZOOM = 9;
const IS_DEV = Boolean(import.meta.env.DEV);
const GEOCODE_REQUEST_DELAY_MS = 1100;
const GEOCODE_MAX_RETRIES = 3;
const MAP_FILTERS_STORAGE_KEY = 'vehicles_v2_map_filters';
const DISTRICT_FILL_OPACITY = 0;
const DISTRICT_CODE_FALLBACK_RE = /^32(0[1-9]|1[0-2])$/;
const DISTRICT_LABEL_MIN_ZOOM_DESKTOP = 8.95;
const DISTRICT_LABEL_MIN_ZOOM_MOBILE = 8.95;
const PRAGUE_LABEL_LATLNG = [50.0635, 14.4618];
const DISTRICTS = [
  'Benešov',
  'Beroun',
  'Kladno',
  'Kolín',
  'Kutná Hora',
  'Mělník',
  'Mladá Boleslav',
  'Nymburk',
  'Praha-východ',
  'Praha-západ',
  'Příbram',
  'Rakovník',
];

const DISTRICT_LABEL_OFFSETS = {
  benesov: [4, 10],
  beroun: [-8, 6],
  kladno: [0, -8],
  kolin: [10, 0],
  'kutna hora': [0, -3],
  melnik: [10, 18],
  'mlada boleslav': [0, -36],
  nymburk: [32, 0],
  'praha-vychod': [0, 0],
  'praha-zapad': [0, 0],
  pribram: [-4, 8],
  rakovnik: [-6, 4],
};

const DISTRICT_LABEL_GEO_OFFSETS = {
  'praha-vychod': { lat: -0.134, lng: 0.062 },
  'praha-zapad': { lat: -0.1, lng: 0.022 },
};

const DISTRICTS_NORMALIZED = DISTRICTS.map((value) => normalizeText(value).replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim());
const STATUS_OPTIONS = [
  { value: 'aktivni', label: 'Jen aktivní' },
  { value: 'all', label: 'Všechny stavy' },
  { value: 'vyrazene', label: 'Jen vyřazené' },
  { value: 'neaktivni', label: 'Jen neaktivní' },
];

// Address-based emergency fallback for known problematic geocoder cases.
// These coordinates are derived from address geocoding results, not legacy station GPS.
const ADDRESS_EMERGENCY_COORDS = {
  'prazska 78 benatky nad jizerou': { lat: 50.2866788, lng: 14.8313350 },
};

function normalizeText(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === '') {
    return '';
  }

  try {
    return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return raw;
  }
}

function parseCsvValues(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '')
    )
  );
}

function selectedLabel(values, fallback = 'vše') {
  return values.length > 0 ? values.join(', ') : fallback;
}

function vehicleColorByType(zzsTyp) {
  const typ = normalizeText(zzsTyp).toUpperCase();

  if (
    typ === ''
    || typ === 'NEZADANO'
    || typ === 'NEZADÁNO'
    || typ === 'NULL'
    || typ === '--'
  ) return '#94a3b8';

  if (typ.includes('RLP') || typ.includes('LEKAR') || typ.includes('LEKARSKA') || typ.includes('LPS')) return '#c81e1e';
  if (typ.includes('RV')) return '#d97706';
  if (typ.includes('RZP')) return '#1d4ed8';
  if (typ.includes('REF') || typ.includes('RENDEZ') || typ.includes('RLP-RV')) return '#7c3aed';
  if (typ.includes('IP') || typ.includes('INSPEKTOR')) return '#0f766e';
  if (typ.includes('VZS') || typ.includes('CLUN') || typ.includes('BOAT')) return '#0891b2';

  return '#475569';
}

function isTargetDistrict(name) {
  const normalized = normalizeText(name).replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
  return DISTRICTS_NORMALIZED.some((district) => normalized.includes(district));
}

function getDistrictColor(okresName) {
  if (!okresName) return '#facc15';
  const name = String(okresName).trim();

  const colors = {
    Rakovník: '#eab308',
    Kladno: '#fef08a',
    Mělník: '#facc15',
    'Mladá Boleslav': '#eab308',
    Nymburk: '#fef08a',
    Kolín: '#eab308',
    'Kutná Hora': '#facc15',
    Benešov: '#fef08a',
    Příbram: '#facc15',
    Beroun: '#eab308',
    'Praha-západ': '#fef08a',
    'Praha-východ': '#facc15',
  };

  for (const [key, color] of Object.entries(colors)) {
    if (name.includes(key)) return color;
  }

  return '#facc15';
}

function formatDistrictLabel(label) {
  const normalized = normalizeText(label).replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
  if (normalized.includes('praha-zapad')) return 'Praha<br/>západ';
  if (normalized.includes('praha-vychod')) return 'Praha<br/>východ';
  if (normalized.includes('mlada boleslav')) return 'Mladá<br/>Boleslav';
  return label;
}

function getDistrictLabelOffset(label) {
  const normalized = normalizeText(label).replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
  const match = Object.entries(DISTRICT_LABEL_OFFSETS).find(([key]) => normalized.includes(key));
  return match ? match[1] : [0, 0];
}

function getDistrictLabelGeoOffset(label) {
  const normalized = normalizeText(label).replace(/[–—−]/g, '-').replace(/\s+/g, ' ').trim();
  const match = Object.entries(DISTRICT_LABEL_GEO_OFFSETS).find(([key]) => normalized.includes(key));
  return match ? match[1] : null;
}

function detectDistrictNameProperty(features) {
  const examples = ['Benešov', 'Kladno', 'Příbram'];

  for (const feature of features) {
    if (!feature || typeof feature !== 'object' || !feature.properties || typeof feature.properties !== 'object') {
      continue;
    }

    for (const [key, value] of Object.entries(feature.properties)) {
      if (typeof value !== 'string') {
        continue;
      }

      if (examples.some((district) => value.includes(district))) {
        return key;
      }
    }
  }

  return 'name';
}

function getDistrictFeatureName(feature, nameProperty) {
  const props = feature?.properties;
  if (!props || typeof props !== 'object') {
    return '';
  }

  const fromProperty = String(props?.[nameProperty] || '').trim();
  if (fromProperty) {
    return fromProperty;
  }

  return String(props?.name || props?.nazev || props?.okres || '').trim();
}

function applyDistrictLabelScale(map) {
  if (typeof window === 'undefined' || !map) {
    return;
  }

  const zoom = Number(map.getZoom?.() || MAP_ZOOM);
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const minZoom = isMobile ? DISTRICT_LABEL_MIN_ZOOM_MOBILE : DISTRICT_LABEL_MIN_ZOOM_DESKTOP;
  const opacity = Math.max(0, Math.min(1, (zoom - minZoom) / 0.55));
  const fontSizePx = Math.max(10.4, Math.min(13.2, 10.4 + (zoom - minZoom) * 1.25));

  document.querySelectorAll('.district-label-tooltip').forEach((element) => {
    const el = element;
    el.style.opacity = String(opacity);
    el.style.fontSize = `${fontSizePx.toFixed(2)}px`;
  });
}

function isReserveVehicle(vehicle) {
  const haystack = [vehicle?.w_groupname, vehicle?.w_stanoviste, vehicle?.w_popis]
    .map((value) => normalizeText(value))
    .join(' ');

  return haystack.includes('zalozni vozy') || haystack.includes('zalozni') || haystack.includes('zalozni vuz') || haystack.includes('nahradni vozidlo');
}

function isRootGroupVehicle(vehicle) {
  const group = normalizeText(vehicle?.w_groupname);
  return group.includes('root');
}

function vehicleColor(vehicle) {
  if (isRootGroupVehicle(vehicle)) {
    return '#dc2626';
  }

  if (isReserveVehicle(vehicle)) {
    return '#dc2626';
  }

  return vehicleColorByType(vehicle?.zzsTyp ?? vehicle?.zzs_typ);
}

function vehicleIconByType(zzsTyp) {
  const typ = normalizeText(zzsTyp).toUpperCase();

  if (
    typ === ''
    || typ === 'NEZADANO'
    || typ === 'NEZADÁNO'
    || typ === 'NULL'
    || typ === '--'
  ) {
    return 'ph-car';
  }

  if (typ.includes('CLUN') || typ.includes('BOAT')) {
    return 'ph-boat';
  }

  if (
    typ.includes('RZP')
    || typ.includes('RLP')
    || typ.includes('RV')
    || typ.includes('VZS')
    || typ.includes('LEKAR')
    || typ.includes('LEKARSKA')
    || typ.includes('LPS')
  ) {
    return 'ph-ambulance';
  }

  return 'ph-car';
}

function vehicleIcon(vehicle) {
  if (isRootGroupVehicle(vehicle)) {
    return 'ph-warning-circle';
  }

  return vehicleIconByType(vehicle?.zzsTyp ?? vehicle?.zzs_typ);
}

function getVehicleMarkerKey(vehicle) {
  return String(vehicle?.id || vehicle?.spz || vehicle?.legacy_carid || '');
}

function parseCoord(value) {
  if (typeof value === 'number') {
    return value;
  }
  const raw = String(value ?? '').trim().replace(',', '.');
  return Number(raw);
}

function getMarkerSizeByZoom(zoom, minZoom, maxZoom, minSize, maxSize) {
  const safeZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : MAP_ZOOM;
  const ratio = Math.max(0, Math.min(1, (safeZoom - minZoom) / (maxZoom - minZoom)));
  return Math.round(minSize + ((maxSize - minSize) * ratio));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDateTimeCs(value, withTime = false) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '-';
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(raw);
  }

  return withTime
    ? date.toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : date.toLocaleDateString('cs-CZ');
}

function formatKm(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return '-';
  }
  return `${Math.round(num).toLocaleString('cs-CZ')} km`;
}

function formatMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return '-';
  }
  return `${num.toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} Kč`;
}

function normalizeStationTyp(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'servis') {
    return 'Servis';
  }
  if (normalized === 'mimo') {
    return 'Mimo';
  }

  return 'VS';
}

function formatVehicleAge(datumZarazeni) {
  const raw = String(datumZarazeni || '').trim();
  if (!raw) {
    return '-';
  }

  const start = new Date(raw);
  if (Number.isNaN(start.getTime())) {
    return '-';
  }

  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs <= 0) {
    return '-';
  }

  const years = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor((diffMs % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
  return years > 0 ? `${years} let ${months} měs.` : `${months} měs.`;
}

function formatWebdispecinkLocation(rawLocation) {
  const value = String(rawLocation || '').trim();
  const normalized = normalizeText(value);

  if (
    value === ''
    || value === '-'
    || value === '--'
    || normalized === '0'
    || normalized === '0.0'
    || normalized === 'null'
    || normalized === 'nezadano'
    || normalized === 'nezadáno'
  ) {
    return '';
  }

  const hasLetter = /[a-zA-Z\u00C0-\u017F]/.test(value);
  if (!hasLetter) {
    return '';
  }

  if (/^cz\s+/i.test(value)) {
    return value;
  }

  return `CZ ${value}`;
}

function buildServiceHistoryBlock(status, orders = [], errorMessage = '') {
  if (status === 'loading') {
    return '<div class="mapa-popup-history-state">Načítám servisní historii...</div>';
  }

  if (status === 'error') {
    return `<div class="mapa-popup-history-state error">${escapeHtml(errorMessage || 'Servisní historii se nepodařilo načíst.')}</div>`;
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return '<div class="mapa-popup-history-state">V EEO nebyly nalezeny servisní objednávky.</div>';
  }

  const rows = orders.slice(0, 10).map((order) => {
    const orderNumber = escapeHtml(order?.cislo_objednavky || '-');
    const orderState = escapeHtml(order?.stav_objednavky || '-');
    const orderSubject = escapeHtml(order?.predmet || '-');
    const supplier = escapeHtml(order?.dodavatel_nazev || '-');
    const sentDate = formatDateTimeCs(order?.dt_odeslani, false);
    const acceptedDate = formatDateTimeCs(order?.dt_akceptace, false);
    const total = Number(order?.faktura_celkem) > 0 ? formatMoney(order?.faktura_celkem) : formatMoney(order?.polozky_celkem);
    const stateClass = normalizeText(orderState).includes('dokonc') ? 'done' : 'default';

    return `
      <div class="mapa-popup-history-item">
        <div class="mapa-popup-history-head">
          <strong>${orderNumber}</strong>
          <span class="price">${escapeHtml(total)}</span>
        </div>
        <div class="mapa-popup-history-subject">${orderSubject}</div>
        <div class="mapa-popup-history-meta">
          <span>Odes: ${escapeHtml(sentDate)}</span>
          <span>Potv: ${escapeHtml(acceptedDate)}</span>
        </div>
        <div class="mapa-popup-history-meta">
          <span>${supplier}</span>
          <span class="state ${stateClass}">${escapeHtml(orderState)}</span>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="mapa-popup-history-list">${rows}</div>`;
}

function buildVehiclePopupContent(vehicle, stationAddress, historyStatus = 'loading', historyOrders = [], historyError = '') {
  const appBase = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const rawSpz = String(vehicle?.spz || '').trim();
  const rawCallSign = String(vehicle?.w_popis || '').trim();
  const callSign = escapeHtml(rawCallSign || rawSpz || '-');
  const spzDisplay = escapeHtml(rawSpz || rawCallSign || '-');
  const zzsTyp = escapeHtml(vehicle?.zzs_typ || '-');
  const vehicleIconClass = vehicleIcon(vehicle);
  const station = escapeHtml(stationAddress || '');
  const group = escapeHtml(vehicle?.w_groupname || '-');
  const locationText = formatWebdispecinkLocation(vehicle?.pos_ln);
  const location = escapeHtml(locationText);
  const manufacturerRaw = String(vehicle?.w_tovarni_znacka || '').trim();
  const modelRaw = String(vehicle?.w_model_vozu || '').trim();
  const brandModel = escapeHtml([manufacturerRaw, modelRaw].filter((value) => value !== '').join(' ') || '-');
  const mileage = escapeHtml(formatKm(vehicle?.najeto_km));
  const assignmentDate = escapeHtml(formatDateTimeCs(vehicle?.datum_zarazeni, false));
  const ageInService = escapeHtml(formatVehicleAge(vehicle?.datum_zarazeni));
  const updated = escapeHtml(formatDateTimeCs(vehicle?.dt_aktualizace || vehicle?.last_update, true));
  const lat = parseCoord(vehicle?.pos_zs);
  const lng = parseCoord(vehicle?.pos_zd);
  const hasGps = Number.isFinite(lat) && Number.isFinite(lng);
  const gps = hasGps ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '';
  const mileageCritical = Number(vehicle?.najeto_km || 0) >= 300000;
  const historyCount = Array.isArray(historyOrders) ? historyOrders.length : 0;
  const googleMapsUrl = hasGps ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : '#';
  const wazeUrl = hasGps ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : '#';
  const detailLink = Number(vehicle?.id || 0) > 0
    ? `<a class="mapa-popup-link" href="${appBase}/vehicles/${Number(vehicle.id)}">Otevřít detail vozidla</a>`
    : '';

  return `
    <div class="mapa-popup mapa-popup-rich">
      <div class="mapa-popup-head">
        <div class="mapa-popup-veh-icon"><i class="ph ${vehicleIconClass}"></i></div>
        <div class="mapa-popup-veh-main">
          <div class="mapa-popup-title-row">
            <strong class="mapa-popup-call">${callSign}</strong>
            <span class="mapa-popup-spz">${spzDisplay}</span>
          </div>
          <div class="mapa-popup-sub-row">
            <span class="mapa-popup-typ">${zzsTyp}</span>
            <span class="mapa-popup-city">${group}</span>
          </div>
        </div>
      </div>

      ${stationAddress ? `<div class="mapa-popup-address"><i class="ph ph-house-line"></i><span>${station}</span></div>` : ''}
      ${locationText ? `<div class="mapa-popup-location"><i class="ph ph-map-pin-line"></i><span>${location}</span></div>` : ''}

      <div class="mapa-popup-grid compact">
        <div class="mapa-popup-row kpi"><span>Značka/model:</span><strong class="muted">${brandModel}</strong></div>
        <div class="mapa-popup-row kpi"><span>Nájezd:</span><strong class="${mileageCritical ? 'alert' : 'ok'}">${mileage}</strong></div>
        <div class="mapa-popup-row kpi"><span>Zařazeno:</span><strong>${assignmentDate}</strong></div>
        <div class="mapa-popup-row kpi"><span>V provozu:</span><strong>${ageInService}</strong></div>
        <div class="mapa-popup-row kpi"><span>Aktualizace:</span><strong class="muted">${updated}</strong></div>
        ${gps ? `<div class="mapa-popup-row gps"><span>GPS:</span><strong>${escapeHtml(gps)}</strong></div>` : ''}
      </div>

      <div class="mapa-popup-actions">
        <a class="mapa-popup-icon-btn" href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" title="Google Maps"><i class="ph ph-navigation-arrow"></i></a>
        <a class="mapa-popup-icon-btn" href="${wazeUrl}" target="_blank" rel="noopener noreferrer" title="Waze"><i class="ph ph-paper-plane-tilt"></i></a>
        ${detailLink}
      </div>

      <div class="mapa-popup-history">
        <div class="mapa-popup-history-title"><i class="ph ph-file-text"></i> Servisní historie (${historyCount})</div>
        ${buildServiceHistoryBlock(historyStatus, historyOrders, historyError)}
      </div>
    </div>
  `;
}

function normalizeLocationToken(value) {
  const normalized = normalizeText(value)
    .replace(/[-.,/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

function logMapDebug(message, payload) {
  if (!IS_DEV) {
    return;
  }

  if (payload === undefined) {
    console.debug(`[VehicleMap] ${message}`);
    return;
  }

  console.debug(`[VehicleMap] ${message}`, payload);
}

function delayMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isValidStationCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 48 && lat <= 52 && lng >= 12 && lng <= 19;
}

function getStationIdentity(station) {
  const id = String(station?.id || '0');
  const mesto = String(station?.mesto || '').trim();
  const ulice = String(station?.ulice || '').trim();
  const psc = String(station?.psc || '').trim();
  return `${id}|${mesto}|${ulice}|${psc}`;
}

function buildGeocodeQuery(station) {
  const ulice = String(station?.ulice || '').trim();
  const mesto = String(station?.mesto || '').trim();
  const psc = String(station?.psc || '').trim();

  const parts = [ulice, mesto, psc, 'Česko'].filter((value) => value !== '');
  return parts.join(', ');
}

function buildCityVariants(mesto) {
  const city = String(mesto || '').trim();
  if (!city) {
    return [];
  }

  const variants = new Set([city]);

  // Examples:
  // "Benátky n. Jizerou" -> "Benátky nad Jizerou"
  // "Lysá n/L." -> "Lysá nad Labem"
  // "Kostelec p. Č. lesy" -> "Kostelec pod Č. lesy"
  const replacements = [
    { pattern: /\bn\.?\s*\/\s*/giu, replacement: 'nad ' },
    { pattern: /\bn\.\s*/giu, replacement: 'nad ' },
    { pattern: /\bn\s+/giu, replacement: 'nad ' },
    { pattern: /\bp\.?\s*\/\s*/giu, replacement: 'pod ' },
    { pattern: /\bp\.\s*/giu, replacement: 'pod ' },
    { pattern: /\bp\s+/giu, replacement: 'pod ' },
  ];

  replacements.forEach(({ pattern, replacement }) => {
    const expanded = city.replace(pattern, replacement).replace(/\s+/g, ' ').trim();
    if (expanded && expanded !== city) {
      variants.add(expanded);
    }
  });

  return Array.from(variants);
}

function buildStreetVariants(ulice) {
  const street = String(ulice || '').trim();
  if (!street) {
    return [];
  }

  const variants = new Set([street]);

  // Example: "Fr. Melichara 370" -> "Františka Melichara 370"
  const expandedFr = street.replace(/^Fr\.\s+/iu, 'Františka ').trim();
  if (expandedFr && expandedFr !== street) {
    variants.add(expandedFr);
  }

  // Fallback variant without dots in abbreviations.
  const noDots = street.replace(/\./g, '').replace(/\s+/g, ' ').trim();
  if (noDots && noDots !== street) {
    variants.add(noDots);
  }

  return Array.from(variants);
}

function buildGeocodeQueryVariants(station) {
  const ulice = String(station?.ulice || '').trim();
  const mesto = String(station?.mesto || '').trim();
  const psc = String(station?.psc || '').trim();

  const cityVariants = buildCityVariants(mesto);
  const streetVariants = buildStreetVariants(ulice);
  const queries = [];

  cityVariants.forEach((city) => {
    streetVariants.forEach((street) => {
      queries.push([street, city, psc, 'Česko'].filter((value) => value !== '').join(', '));
      queries.push([street, city, 'Česko'].filter((value) => value !== '').join(', '));
    });

    queries.push([city, psc, 'Česko'].filter((value) => value !== '').join(', '));
    queries.push([city, 'Česko'].filter((value) => value !== '').join(', '));
  });

  return Array.from(new Set(queries.filter((value) => value !== '')));
}

function buildStationAddressText(station) {
  return [station?.ulice, station?.psc, station?.mesto]
    .filter((item) => String(item || '').trim() !== '')
    .join(', ');
}

function normalizeStationLookupKey(value) {
  return normalizeText(value)
    .replace(/[-.,/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildStationAddressIndex(stations) {
  const index = new Map();

  (Array.isArray(stations) ? stations : []).forEach((station) => {
    const address = buildStationAddressText(station);
    if (!address) {
      return;
    }

    [station?.mesto, station?.stanoviste, station?.nazev_stanoviste, station?.w_ln_match].forEach((value) => {
      const key = normalizeStationLookupKey(value);
      if (key && !index.has(key)) {
        index.set(key, address);
      }
    });
  });

  return index;
}

function resolveVehicleStationAddress(vehicle, stationAddressIndex) {
  const candidates = [vehicle?.w_groupname, vehicle?.w_stanoviste, vehicle?.pos_ln];

  for (const candidate of candidates) {
    const key = normalizeStationLookupKey(candidate);
    if (key && stationAddressIndex.has(key)) {
      return stationAddressIndex.get(key) || '';
    }
  }

  return '';
}

function formatFuelTank(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    return '-';
  }

  return `${Math.round(num)} %`;
}

function stationVehicleMatch(vehicle, station) {
  const stationKeys = [station?.mesto, station?.stanoviste, station?.nazev_stanoviste]
    .map((value) => normalizeStationLookupKey(value))
    .filter((value) => value !== '');

  if (stationKeys.length === 0) {
    return false;
  }

  const homeStationKey = normalizeStationLookupKey(vehicle?.w_stanoviste);
  if (homeStationKey !== '' && homeStationKey !== 'nezadano') {
    return stationKeys.includes(homeStationKey);
  }

  const fallbackGroupKey = normalizeStationLookupKey(vehicle?.w_groupname);
  if (fallbackGroupKey !== '' && fallbackGroupKey !== 'nezadano') {
    return stationKeys.includes(fallbackGroupKey);
  }

  return false;
}

function buildStationVehiclesContent(station, vehicles) {
  const assignedVehicles = (Array.isArray(vehicles) ? vehicles : [])
    .filter((vehicle) => stationVehicleMatch(vehicle, station))
    .sort((left, right) => String(left?.spz || '').localeCompare(String(right?.spz || ''), 'cs', { sensitivity: 'base', numeric: true }));

  if (assignedVehicles.length === 0) {
    return '<div class="mapa-popup-station-empty">Pod stanoviště se nepodařilo přiřadit žádná vozidla.</div>';
  }

  const items = assignedVehicles.map((vehicle) => {
    const callSign = escapeHtml(String(vehicle?.w_popis || '-'));
    const typ = escapeHtml(vehicle?.zzs_typ || '-');
    const spz = escapeHtml(vehicle?.spz || '-');
    const mileage = escapeHtml(formatKm(vehicle?.najeto_km));
    const fuel = escapeHtml(formatFuelTank(vehicle?.w_nadrz));

    return `
      <div class="mapa-popup-station-vehicle-item">
        <div class="mapa-popup-station-vehicle-head">
          <strong>${callSign} - ${typ}</strong>
          <span>${spz}</span>
        </div>
        <div class="mapa-popup-station-vehicle-meta">
          <span>Nájezd: ${mileage}</span>
          <span>PHM: ${fuel}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="mapa-popup-station-vehicles-block">
      <div class="mapa-popup-station-vehicles-title">Vozidla stanoviště (${assignedVehicles.length})</div>
      <div class="mapa-popup-station-vehicles-list">${items}</div>
    </div>
  `;
}

function buildStationPopupContent(station, stationAddress, stationLocalization, vehicles) {
  const stationLabel = escapeHtml(String(station?.nazev_stanoviste || station?.mesto || station?.stanoviste || 'Bez názvu'));
  const address = escapeHtml(stationAddress || '-');
  const stationType = escapeHtml(String(station?.typ || 'VS'));
  const localization = escapeHtml(stationLocalization || '-');

  return `
    <div class="mapa-popup mapa-popup-station-rich">
      <h3>${stationLabel}</h3>
      <p>${address}</p>
      <div class="mapa-popup-row"><strong>Typ:</strong> ${stationType}</div>
      <div class="mapa-popup-row"><strong>Lokalizace:</strong> ${localization}</div>
      <div class="mapa-popup-station-vehicles">${buildStationVehiclesContent(station, vehicles)}</div>
    </div>
  `;
}

function buildStationLocalizationLabel(station) {
  return String(station?.typ || '').trim() === 'VS' ? 'Výjezdové stanoviště' : 'Adresa města';
}

function buildAddressEmergencyKey(station) {
  const raw = [station?.ulice, station?.mesto]
    .filter((item) => String(item || '').trim() !== '')
    .join(' ');
  return normalizeLocationToken(raw);
}

function readCachedGeocodeByQuery(query) {
  if (!query) {
    return null;
  }

  const cacheKey = `vehicles_v2_station_geocode_${normalizeLocationToken(query)}`;
  try {
    const cachedRaw = localStorage.getItem(cacheKey);
    if (!cachedRaw) {
      return null;
    }

    const cached = JSON.parse(cachedRaw);
    const lat = Number(cached?.lat);
    const lng = Number(cached?.lng);
    if (!isValidStationCoord(lat, lng)) {
      return null;
    }

    return { lat, lng };
  } catch {
    return null;
  }
}

function readCachedGeocodeForStation(station) {
  const query = buildGeocodeQuery(station);
  return readCachedGeocodeByQuery(query);
}

async function geocodeViaPhoton(query, stationId) {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    logMapDebug('Photon HTTP fail', { id: stationId, query, status: response.status });
    return null;
  }

  const data = await response.json();
  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  const lon = Number(feature?.geometry?.coordinates?.[0]);
  const lat = Number(feature?.geometry?.coordinates?.[1]);

  if (!isValidStationCoord(lat, lon)) {
    logMapDebug('Photon invalid/outside CZ bounds', { id: stationId, query, lat, lon, feature });
    return null;
  }

  return { lat, lng: lon };
}

async function geocodeAnyAddress(query) {
  const cached = readCachedGeocodeByQuery(query);
  if (cached) {
    return { lat: cached.lat, lng: cached.lng, source: 'address_cache' };
  }

  const cacheKey = `vehicles_v2_station_geocode_${normalizeLocationToken(query)}`;

  const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search');
  nominatimUrl.searchParams.set('format', 'jsonv2');
  nominatimUrl.searchParams.set('limit', '1');
  nominatimUrl.searchParams.set('countrycodes', 'cz');
  nominatimUrl.searchParams.set('q', query);

  let response = null;
  for (let attempt = 1; attempt <= GEOCODE_MAX_RETRIES; attempt += 1) {
    response = await fetch(nominatimUrl.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (response.status !== 429) {
      break;
    }

    await delayMs(GEOCODE_REQUEST_DELAY_MS * attempt);
  }

  if (response && response.ok) {
    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (isValidStationCoord(lat, lng)) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
      } catch {
        // ignore localStorage quota issues
      }
      return { lat, lng, source: 'address_geocode' };
    }
  }

  const photon = await geocodeViaPhoton(query, 'free-search');
  if (photon) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ lat: photon.lat, lng: photon.lng }));
    } catch {
      // ignore localStorage quota issues
    }
    return { lat: photon.lat, lng: photon.lng, source: 'address_geocode' };
  }

  return null;
}

async function geocodeStationByAddress(station) {
  const queries = buildGeocodeQueryVariants(station);

  if (queries.length === 0) {
    logMapDebug('Geocode skip: prazdna adresa', {
      id: station?.id,
      mesto: station?.mesto,
      ulice: station?.ulice,
      psc: station?.psc,
    });
    return null;
  }

  logMapDebug('Geocode start', {
    id: station?.id,
    queries,
  });

  for (const query of queries) {
    const cached = readCachedGeocodeByQuery(query);
    if (cached) {
      logMapDebug('Geocode cache hit', { id: station?.id, query, lat: cached.lat, lng: cached.lng });
      return { lat: cached.lat, lng: cached.lng, source: 'address_cache' };
    }

    const cacheKey = `vehicles_v2_station_geocode_${normalizeLocationToken(query)}`;

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycodes', 'cz');
    url.searchParams.set('q', query);

    let response = null;
    for (let attempt = 1; attempt <= GEOCODE_MAX_RETRIES; attempt += 1) {
      response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.status !== 429) {
        break;
      }

      logMapDebug('Geocode rate-limited (429), retrying', { id: station?.id, query, attempt });
      await delayMs(GEOCODE_REQUEST_DELAY_MS * attempt);
    }

    if (!response) {
      continue;
    }

    if (!response.ok) {
      logMapDebug('Geocode HTTP fail', { id: station?.id, query, status: response.status });
      continue;
    }

    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (isValidStationCoord(lat, lng)) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
      } catch {
        // ignore localStorage quota issues
      }

      return { lat, lng, source: 'address_geocode' };
    }

    logMapDebug('Geocode invalid/outside CZ bounds', { id: station?.id, query, lat, lng, first });

    // Secondary provider fallback for addresses Nominatim fails to resolve.
    const photon = await geocodeViaPhoton(query, station?.id);
    if (photon) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ lat: photon.lat, lng: photon.lng }));
      } catch {
        // ignore localStorage quota issues
      }

      logMapDebug('Geocode success via Photon fallback', { id: station?.id, query, lat: photon.lat, lng: photon.lng });
      return { lat: photon.lat, lng: photon.lng, source: 'address_geocode' };
    }

    continue;
  }

  logMapDebug('Geocode fail: zadna varianta adresy nevratila pouzitelny bod', {
    id: station?.id,
    mesto: station?.mesto,
    ulice: station?.ulice,
    psc: station?.psc,
    w_ln_match: station?.w_ln_match,
  });

  const emergencyKey = buildAddressEmergencyKey(station);
  const emergency = ADDRESS_EMERGENCY_COORDS[emergencyKey];
  if (emergency && isValidStationCoord(Number(emergency.lat), Number(emergency.lng))) {
    logMapDebug('Geocode emergency fallback hit', {
      id: station?.id,
      emergencyKey,
      lat: emergency.lat,
      lng: emergency.lng,
    });
    return { lat: Number(emergency.lat), lng: Number(emergency.lng), source: 'address_geocode' };
  }

  return null;
}

function buildStationsWithCoords(stations) {
  const stationsFiltered = (Array.isArray(stations) ? stations : []).filter((item) => {
    const typ = String(item.typ || '').trim();
    return typ === 'VS' || typ === 'Servis';
  });

  return stationsFiltered.map((station) => {
    const cached = readCachedGeocodeForStation(station);
    const hasCoords = isValidStationCoord(Number(cached?.lat), Number(cached?.lng));

    return {
      ...station,
      latitude: hasCoords ? Number(cached.lat) : null,
      longitude: hasCoords ? Number(cached.lng) : null,
      position_source: hasCoords ? 'address_cache' : 'none',
      position_w_ln: String(station.w_ln_match || ''),
    };
  });
}

export default function VehicleMapPage() {
  const [stations, setStations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSeconds, setSyncSeconds] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncMessageVisible, setSyncMessageVisible] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    try {
      const raw = localStorage.getItem(MAP_FILTERS_STORAGE_KEY);
      if (!raw) {
        return '';
      }

      const parsed = JSON.parse(raw);
      return String(parsed?.search || '');
    } catch {
      return '';
    }
  });
  const debouncedSearch = useDebouncedValue(search, 750);
  const [showVehicles, setShowVehicles] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      const raw = localStorage.getItem(MAP_FILTERS_STORAGE_KEY);
      if (!raw) {
        return true;
      }

      const parsed = JSON.parse(raw);
      return parsed?.showVehicles !== false;
    } catch {
      return true;
    }
  });
  const [showVsStations, setShowVsStations] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      const raw = localStorage.getItem(MAP_FILTERS_STORAGE_KEY);
      if (!raw) {
        return true;
      }

      const parsed = JSON.parse(raw);
      if (typeof parsed?.showVsStations === 'boolean') {
        return parsed.showVsStations;
      }

      // Legacy combined switch is intentionally ignored to avoid stale production
      // localStorage values hiding both layers unexpectedly.
      return true;
    } catch {
      return true;
    }
  });
  const [showServiceStations, setShowServiceStations] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      const raw = localStorage.getItem(MAP_FILTERS_STORAGE_KEY);
      if (!raw) {
        return true;
      }

      const parsed = JSON.parse(raw);
      if (typeof parsed?.showServiceStations === 'boolean') {
        return parsed.showServiceStations;
      }

      // Legacy combined switch is intentionally ignored to avoid stale production
      // localStorage values hiding both layers unexpectedly.
      return true;
    } catch {
      return true;
    }
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window === 'undefined') {
      return 'aktivni';
    }

    try {
      const raw = localStorage.getItem(MAP_FILTERS_STORAGE_KEY);
      if (!raw) {
        return 'aktivni';
      }

      const parsed = JSON.parse(raw);
      const status = String(parsed?.statusFilter || 'aktivni').toLowerCase();
      return STATUS_OPTIONS.some((item) => item.value === status) ? status : 'aktivni';
    } catch {
      return 'aktivni';
    }
  });
  const [selectedTypeFilters, setSelectedTypeFilters] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(MAP_FILTERS_STORAGE_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.typeFilters)) {
        return parseCsvValues(parsed.typeFilters.join(','));
      }

      const type = String(parsed?.typeFilter || 'all').trim();
      return type !== '' && type !== 'all' ? [type] : [];
    } catch {
      return [];
    }
  });
  const [typeOptions, setTypeOptions] = useState([]);
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(0);
  const [freeAddressPoint, setFreeAddressPoint] = useState(null);
  const [mapZoom, setMapZoom] = useState(MAP_ZOOM);
  const [updatedAt, setUpdatedAt] = useState(null);

  const mapContainerRef = useRef(null);
  const mapToolbarRef = useRef(null);
  const mapRef = useRef(null);
  const stationMarkersRef = useRef({});
  const vehicleMarkersRef = useRef({});
  const freeAddressMarkerRef = useRef(null);
  const serviceHistoryCacheRef = useRef(new Map());
  const districtBoundaryLayerRef = useRef(null);
  const districtLabelLayerRef = useRef(null);
  const districtGeoJsonCacheRef = useRef(null);
  const suppressNextAutoFitRef = useRef(false);

  const fulltext = normalizeText(debouncedSearch);
  const stationAddressIndex = useMemo(() => buildStationAddressIndex(stations), [stations]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(
      MAP_FILTERS_STORAGE_KEY,
      JSON.stringify({
        search,
        showVehicles,
        showVsStations,
        showServiceStations,
        statusFilter,
        typeFilters: selectedTypeFilters,
      })
    );
  }, [search, showVehicles, showVsStations, showServiceStations, statusFilter, selectedTypeFilters]);

  useEffect(() => {
    if (!openFilterKey) {
      return undefined;
    }

    function handleOutsidePointerDown(event) {
      if (!mapToolbarRef.current) {
        return;
      }

      if (!mapToolbarRef.current.contains(event.target)) {
        setOpenFilterKey(null);
      }
    }

    document.addEventListener('mousedown', handleOutsidePointerDown);
    document.addEventListener('touchstart', handleOutsidePointerDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsidePointerDown);
      document.removeEventListener('touchstart', handleOutsidePointerDown);
    };
  }, [openFilterKey]);

  const stationMatchesQuery = (item, q) => {
    const haystack = [item.mesto, item.ulice, item.psc, item.organizace, item.nazev_stanoviste]
      .map((value) => normalizeText(value))
      .join(' ');
    return haystack.includes(q);
  };

  const vehicleMatchesQuery = (vehicle, q) => {
    const haystack = [
      vehicle.spz,
      vehicle.w_popis,
      vehicle.w_groupname,
      vehicle.w_stanoviste,
      vehicle.w_model_vozu,
      vehicle.w_tovarni_znacka,
      vehicle.w_typ_phm,
      vehicle.zzs_typ,
      vehicle.pos_ln,
      vehicle.legacy_carid,
    ].map((value) => normalizeText(value)).join(' ');
    return haystack.includes(q);
  };

  const filteredStations = useMemo(() => {
    if (!showVsStations && !showServiceStations) {
      return [];
    }

    const q = fulltext;

    return stations.filter((item) => {
      const stationType = String(item?.typ || '').trim();
      const isVs = stationType === 'VS';
      const isService = stationType === 'Servis';

      if ((isVs && !showVsStations) || (isService && !showServiceStations)) {
        return false;
      }

      if (q === '') {
        return true;
      }

      return stationMatchesQuery(item, q);
    });
  }, [fulltext, showVsStations, showServiceStations, stations]);

  const locatedStations = useMemo(
    () => filteredStations.filter((item) => isValidStationCoord(Number(item.latitude), Number(item.longitude))),
    [filteredStations]
  );

  const filteredVehiclesOnMap = useMemo(() => {
    const q = fulltext;
    if (q === '') {
      return vehicles;
    }

    return vehicles.filter((vehicle) => vehicleMatchesQuery(vehicle, q));
  }, [fulltext, vehicles]);

  async function fetchAllVehiclesForMap() {
      const pageSize = 200;
      const baseParams = {
        status: statusFilter,
        types: selectedTypeFilters.length > 0 ? selectedTypeFilters.join(',') : undefined,
        perPage: pageSize,
        includeFilterOptions: '1',
        sortBy: 'spz',
        sortDir: 'asc',
      };

      const first = await fetchVehicles({ ...baseParams, page: 1 });
      const firstItems = Array.isArray(first?.data?.items) ? first.data.items : [];
      const firstTypes = Array.isArray(first?.data?.filterOptions?.types) ? first.data.filterOptions.types : [];
      const total = Number(first?.data?.total || firstItems.length || 0);
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      if (totalPages <= 1) {
        return {
          items: firstItems,
          types: firstTypes,
          updatedAt: first?.data?.updatedAt || null,
        };
      }

      const pages = [];
      for (let page = 2; page <= totalPages; page += 1) {
        pages.push(fetchVehicles({ ...baseParams, includeFilterOptions: '0', page }));
      }

      const nextResults = await Promise.all(pages);
      const nextItems = nextResults.flatMap((response) => {
        const items = response?.data?.items;
        return Array.isArray(items) ? items : [];
      });

      return {
        items: [...firstItems, ...nextItems],
        types: firstTypes,
        updatedAt: first?.data?.updatedAt || null,
      };
  }

  async function loadData() {
    setLoading(true);
    setError('');

    const [stationsResult, vehiclesResult] = await Promise.allSettled([
      fetchStationAddresses(),
      fetchAllVehiclesForMap(),
    ]);

    const stationsLoaded = stationsResult.status === 'fulfilled';
    const vehiclesLoaded = vehiclesResult.status === 'fulfilled';

    const stationItemsRaw = stationsLoaded && Array.isArray(stationsResult.value?.data?.items)
      ? stationsResult.value.data.items
      : [];
    const vehicleItems = vehiclesLoaded && Array.isArray(vehiclesResult.value?.items)
      ? vehiclesResult.value.items
      : [];
    const nextTypeOptions = vehiclesLoaded && Array.isArray(vehiclesResult.value?.types)
      ? vehiclesResult.value.types
      : [];
    const nextUpdatedAt = vehiclesLoaded ? (vehiclesResult.value?.updatedAt || null) : null;

    const stationItems = buildStationsWithCoords(stationItemsRaw);

    setStations(stationItems);
    setVehicles(vehicleItems);
    setTypeOptions(nextTypeOptions);
    setUpdatedAt(nextUpdatedAt);

    if (!stationsLoaded && !vehiclesLoaded) {
      setError('Nepodařilo se načíst stanoviště ani vozidla.');
    } else if (!stationsLoaded) {
      setError('Nepodařilo se načíst seznam měst.');
    } else if (!vehiclesLoaded) {
      setError('Nepodařilo se načíst seznam vozidel.');
    } else {
      setError('');
    }

    setLoading(false);
  }

  useEffect(() => {
    let active = true;

    void loadData().catch(() => {
      if (!active) {
        return;
      }
      setError('Nepodařilo se načíst mapová data.');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [statusFilter, selectedTypeFilters]);

  useEffect(() => {
    if (!syncing) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSyncSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [syncing]);

  useEffect(() => {
    if (selectedTypeFilters.length === 0) {
      return;
    }

    if (typeOptions.length === 0) {
      return;
    }

    const allowedTypes = new Set(typeOptions);
    const nextSelectedTypes = selectedTypeFilters.filter((value) => allowedTypes.has(value));
    if (nextSelectedTypes.length === selectedTypeFilters.length) {
      return;
    }

    setSelectedTypeFilters(nextSelectedTypes);
  }, [selectedTypeFilters, typeOptions]);

  function toggleTypeFilter(value) {
    setSelectedTypeFilters((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }

      return [...prev, value];
    });
  }

  async function handleRefreshFromWebdispecink() {
    setSyncing(true);
    setSyncSeconds(0);
    setSyncMessage('');
    setSyncMessageVisible(false);

    try {
      const syncResponse = await triggerQuickSync();
      const [summaryResponse] = await Promise.all([
        fetchDashboardMetrics({ status: 'all' }),
        loadData(),
      ]);

      const summary = summaryResponse?.data?.summary || {};
      const synchronized = Number(syncResponse?.data?.affectedRows || 0);
      const active = Number(summary?.active || 0);
      const retired = Number(summary?.retired || 0);
      const inactive = Number(summary?.inactive || 0);
      setSyncMessage(
        `Synchronizace byla úspěšně dokončena. Synchronizováno: ${synchronized}. Aktivní: ${active}, vyřazené: ${retired}, neaktivní: ${inactive}.`
      );
      setSyncMessageVisible(true);
    } catch {
      setSyncMessage('Aktualizace poloh z Webdispečinku se nepodařila.');
      setSyncMessageVisible(true);
    } finally {
      setSyncing(false);
    }
  }

  function resetMapFilters() {
    suppressNextAutoFitRef.current = true;
    setSearch('');
    setStatusFilter('aktivni');
    setSelectedTypeFilters([]);
    setShowVehicles(true);
    setShowVsStations(true);
    setShowServiceStations(true);
    setFreeAddressPoint(null);
  }

  useEffect(() => {
    let cancelled = false;

    const missingStations = stations.filter(
      (station) => !isValidStationCoord(Number(station.latitude), Number(station.longitude))
    );

    if (missingStations.length === 0) {
      return undefined;
    }

    async function geocodeMissingStations() {
      const updates = new Map();

      for (const station of missingStations) {
        if (cancelled) {
          return;
        }

        try {
          const geocode = await geocodeStationByAddress(station);
          if (geocode && isValidStationCoord(geocode.lat, geocode.lng)) {
            updates.set(getStationIdentity(station), geocode);
          }
        } catch {
          // keep silent; station remains without map point
        }

        if (!cancelled) {
          await delayMs(GEOCODE_REQUEST_DELAY_MS);
        }
      }

      if (cancelled || updates.size === 0) {
        return;
      }

      setStations((prev) => prev.map((station) => {
        const identity = getStationIdentity(station);
        const geocode = updates.get(identity);
        if (!geocode) {
          return station;
        }

        return {
          ...station,
          latitude: geocode.lat,
          longitude: geocode.lng,
          position_source: geocode.source,
        };
      }));
    }

    void geocodeMissingStations();

    return () => {
      cancelled = true;
    };
  }, [stations]);

  useEffect(() => {
    let cancelled = false;

    if (fulltext === '') {
      setFreeAddressPoint(null);
      return undefined;
    }

    const hasStationMatch = stations.some((item) => stationMatchesQuery(item, fulltext));
    const hasVehicleMatch = vehicles.some((item) => vehicleMatchesQuery(item, fulltext));
    if (hasStationMatch || hasVehicleMatch) {
      setFreeAddressPoint(null);
      return undefined;
    }

    async function geocodeFreeText() {
      const query = String(debouncedSearch || '').trim();
      if (!query) {
        return;
      }

      const geocode = await geocodeAnyAddress(query);
      if (cancelled) {
        return;
      }

      if (geocode && isValidStationCoord(geocode.lat, geocode.lng)) {
        setFreeAddressPoint({
          lat: geocode.lat,
          lng: geocode.lng,
          label: query,
        });
      } else {
        setFreeAddressPoint(null);
      }
    }

    void geocodeFreeText();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, fulltext, stations, vehicles]);

  async function loadDistrictBoundaries(map) {
    if (!map) {
      return;
    }

    const renderDistricts = (data) => {
      const features = Array.isArray(data?.features) ? data.features : [];
      if (features.length === 0) {
        return 0;
      }

      const nameProperty = detectDistrictNameProperty(features);

      let filteredFeatures = features.filter((feature) => {
        const districtName = getDistrictFeatureName(feature, nameProperty);
        return districtName && isTargetDistrict(districtName);
      });

      if (filteredFeatures.length === 0) {
        filteredFeatures = features.filter((feature) => {
          const code = String(feature?.nationalCode || feature?.properties?.nationalCode || '').trim();
          return DISTRICT_CODE_FALLBACK_RE.test(code);
        });
      }

      if (filteredFeatures.length === 0) {
        return 0;
      }

      if (districtBoundaryLayerRef.current) {
        districtBoundaryLayerRef.current.remove();
        districtBoundaryLayerRef.current = null;
      }

      if (districtLabelLayerRef.current) {
        districtLabelLayerRef.current.remove();
        districtLabelLayerRef.current = null;
      }

      const districtLabelLayer = L.layerGroup().addTo(map);
      districtLabelLayerRef.current = districtLabelLayer;

      const renderer = L.canvas({ padding: 0.5 });

      const boundaryLayer = L.geoJSON(
        { type: 'FeatureCollection', features: filteredFeatures },
        {
          renderer,
          style: (feature) => ({
            fillColor: getDistrictColor(getDistrictFeatureName(feature, nameProperty)),
            weight: 3,
            opacity: 1,
            color: '#000000',
            dashArray: '',
            fillOpacity: DISTRICT_FILL_OPACITY,
          }),
          onEachFeature: (feature, layer) => {
            const fullLabel = getDistrictFeatureName(feature, nameProperty);
            const shortLabel = fullLabel.replace('Okres ', '');
            const offset = getDistrictLabelOffset(shortLabel);
            const geoOffset = getDistrictLabelGeoOffset(shortLabel);

            if (geoOffset) {
              const bounds = layer.getBounds?.();
              if (bounds?.isValid()) {
                const center = bounds.getCenter();
                const latLng = [center.lat + geoOffset.lat, center.lng + geoOffset.lng];
                L.circleMarker(latLng, {
                  radius: 0,
                  stroke: false,
                  fillOpacity: 0,
                  interactive: false,
                })
                  .addTo(districtLabelLayer)
                  .bindTooltip(formatDistrictLabel(shortLabel), {
                    permanent: true,
                    direction: 'center',
                    offset: [0, 0],
                    className: 'district-label-tooltip',
                  });
              }
              return;
            }

            layer.bindTooltip(formatDistrictLabel(shortLabel), {
              permanent: true,
              direction: 'center',
              offset,
              className: 'district-label-tooltip',
            });
          },
        }
      ).addTo(map);

      L.circleMarker(PRAGUE_LABEL_LATLNG, {
        radius: 0,
        stroke: false,
        fillOpacity: 0,
        interactive: false,
      })
        .addTo(districtLabelLayer)
        .bindTooltip('Praha', {
          permanent: true,
          direction: 'center',
          offset: [0, 0],
          className: 'district-label-tooltip district-label-tooltip--praha-city',
        });

      districtBoundaryLayerRef.current = boundaryLayer;
      applyDistrictLabelScale(map);
      return filteredFeatures.length;
    };

    try {
      if (districtGeoJsonCacheRef.current) {
        const rendered = renderDistricts(districtGeoJsonCacheRef.current);
        if (rendered > 0) {
          logMapDebug('Hranice okresů načteny z cache', { count: rendered });
          return;
        }
      }

      const baseUrlRaw = import.meta.env.BASE_URL || '/';
      const baseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw : `${baseUrlRaw}/`;
      const reducedUrl = `${window.location.origin}${baseUrl}data/okresy-stc-reduced.geojson`;
      const fallbackUrl = `${window.location.origin}${baseUrl}data/okresy-stc.geojson`;

      const loadGeoJson = async (url) => {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      };

      let payload = null;
      try {
        payload = await loadGeoJson(reducedUrl);
      } catch {
        payload = await loadGeoJson(fallbackUrl);
      }

      districtGeoJsonCacheRef.current = payload;
      const rendered = renderDistricts(payload);
      if (rendered <= 0) {
        logMapDebug('Hranice okresů nebyly nalezeny v GeoJSON datech');
      } else {
        logMapDebug('Hranice okresů vykresleny', { count: rendered });
      }
    } catch (boundaryError) {
      logMapDebug('Načtení hranic okresů selhalo', { message: String(boundaryError?.message || boundaryError) });
    }
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return undefined;

    try {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        wheelPxPerZoomLevel: 140,
      }).setView(MAP_CENTER, MAP_ZOOM);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setMapZoom(Number(map.getZoom() || MAP_ZOOM));

      // Leaflet needs explicit size recalculation when parent layout changes.
      requestAnimationFrame(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 120);

      const handleWindowResize = () => {
        map.invalidateSize();
      };
      const handleZoomEnd = () => {
        setMapZoom(Number(map.getZoom() || MAP_ZOOM));
        applyDistrictLabelScale(map);
      };
      window.addEventListener('resize', handleWindowResize);
      map.on('zoomend', handleZoomEnd);

      let resizeObserver = null;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      map.__v2Cleanup = () => {
        window.removeEventListener('resize', handleWindowResize);
        map.off('zoomend', handleZoomEnd);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };

      void loadDistrictBoundaries(map);
    } catch {
      setError('Nepodařilo se inicializovat mapový podklad Leaflet.');
    }

    return () => {
      if (mapRef.current) {
        if (districtBoundaryLayerRef.current) {
          districtBoundaryLayerRef.current.remove();
          districtBoundaryLayerRef.current = null;
        }
        if (districtLabelLayerRef.current) {
          districtLabelLayerRef.current.remove();
          districtLabelLayerRef.current = null;
        }
        if (typeof mapRef.current.__v2Cleanup === 'function') {
          mapRef.current.__v2Cleanup();
        }
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ pan: false, debounceMoveend: true });
    });

    resizeObserver.observe(container);
    map.invalidateSize({ pan: false, debounceMoveend: true });

    return () => {
      resizeObserver.disconnect();
    };
  }, [filteredStations.length, filteredVehiclesOnMap.length, showVehicles]);

  useEffect(() => {
    if (!mapRef.current) return;
    // Recompute viewport after data/layout updates to avoid gray unrendered strips.
    requestAnimationFrame(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
  }, [filteredStations.length, filteredVehiclesOnMap.length, showVehicles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(stationMarkersRef.current).forEach((marker) => marker.remove());
    stationMarkersRef.current = {};

    locatedStations.forEach((station) => {
      const lat = Number(station.latitude);
      const lng = Number(station.longitude);
      if (!isValidStationCoord(lat, lng)) return;

      const source = String(station.position_source || 'none');
      const markerClass = source === 'address_geocode' || source === 'address_cache' ? 'exact' : 'none';
      const stationType = String(station.typ || '').trim();
      const isServiceStation = stationType === 'Servis';
      const stationColor = isServiceStation
        ? (markerClass === 'exact' ? '#d97706' : '#92400e')
        : (markerClass === 'exact' ? '#0ea5e9' : '#64748b');
      const stationSize = getMarkerSizeByZoom(mapZoom, 8, 14, 20, 28);
      const stationIconSize = Math.round(stationSize * 0.58);
      const icon = L.divIcon({
        className: 'mapa-station-marker-wrap',
        html: `
          <div class="mapa-station-icon-marker ${markerClass}${isServiceStation ? ' service' : ''}" style="width:${stationSize}px;height:${stationSize}px;background:${stationColor};">
            <i class="ph ${isServiceStation ? 'ph-key' : 'ph-house-line'}" style="font-size:${stationIconSize}px;"></i>
          </div>
        `,
        iconSize: [stationSize, stationSize],
        iconAnchor: [Math.round(stationSize / 2), Math.round(stationSize / 2)],
      });

      const stationAddress = [station.ulice, station.psc, station.mesto || station.stanoviste].filter((item) => String(item || '').trim() !== '').join(', ');
      const stationLabel = String(station.nazev_stanoviste || station.mesto || station.stanoviste || 'Bez názvu');
      const stationLocalization = buildStationLocalizationLabel(station);
      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(buildStationPopupContent(station, stationAddress, stationLocalization, showVehicles ? filteredVehiclesOnMap : []), {
          maxWidth: 360,
          minWidth: 300,
        });

      marker.on('click', () => {
        setSelectedStationId(Number(station.id || 0));
      });

      stationMarkersRef.current[station.id] = marker;
    });
  }, [locatedStations, mapZoom, filteredVehiclesOnMap, showVehicles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(vehicleMarkersRef.current).forEach((marker) => marker.remove());
    vehicleMarkersRef.current = {};

    if (!showVehicles) return;

    filteredVehiclesOnMap.forEach((vehicle) => {
      const lat = parseCoord(vehicle.pos_zs);
      const lng = parseCoord(vehicle.pos_zd);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 48 || lat > 52 || lng < 12 || lng > 19) {
        return;
      }

      const color = vehicleColor(vehicle);
      const vehicleGlyphClass = vehicleIcon(vehicle);
      const stationAddress = resolveVehicleStationAddress(vehicle, stationAddressIndex);
      const vehicleSize = getMarkerSizeByZoom(mapZoom, 8, 14, 22, 32);
      const vehicleIconSize = Math.round(vehicleSize * 0.64);
      const icon = L.divIcon({
        className: 'mapa-vehicle-marker-wrap',
        html: `
          <div class="mapa-vehicle-icon-marker" style="width:${vehicleSize}px;height:${vehicleSize}px;background:${color};">
            <i class="ph ${vehicleGlyphClass}" style="font-size:${vehicleIconSize}px;"></i>
          </div>
        `,
        iconSize: [vehicleSize, vehicleSize],
        iconAnchor: [Math.round(vehicleSize / 2), Math.round(vehicleSize / 2)],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(
        buildVehiclePopupContent(vehicle, stationAddress, 'loading', []),
        { maxWidth: 400, minWidth: 320, className: 'vehicle-popup-full-width' }
      );

      marker.on('popupopen', async () => {
        const spz = String(vehicle?.spz || '').trim();
        const cacheKey = spz !== '' ? spz : String(getVehicleMarkerKey(vehicle) || '');

        if (cacheKey !== '' && serviceHistoryCacheRef.current.has(cacheKey)) {
          const cached = serviceHistoryCacheRef.current.get(cacheKey);
          marker.getPopup().setContent(buildVehiclePopupContent(vehicle, stationAddress, 'ready', cached, ''));
          return;
        }

        if (spz === '') {
          marker.getPopup().setContent(buildVehiclePopupContent(vehicle, stationAddress, 'error', [], 'Chybí SPZ vozidla.'));
          return;
        }

        marker.getPopup().setContent(buildVehiclePopupContent(vehicle, stationAddress, 'loading', []));

        try {
          const response = await fetchVehicleServiceHistory(spz);
          const ordersRaw = Array.isArray(response?.orders)
            ? response.orders
            : (Array.isArray(response?.data) ? response.data : []);

          const ordersSorted = [...ordersRaw].sort((a, b) => {
            const dateA = new Date(a?.dt_akceptace || a?.dt_odeslani || a?.dt_objednavky || 0);
            const dateB = new Date(b?.dt_akceptace || b?.dt_odeslani || b?.dt_objednavky || 0);
            return dateB - dateA;
          });

          if (cacheKey !== '') {
            serviceHistoryCacheRef.current.set(cacheKey, ordersSorted);
          }

          marker.getPopup().setContent(buildVehiclePopupContent(vehicle, stationAddress, 'ready', ordersSorted, ''));
        } catch (historyError) {
          const message = historyError?.message || 'Chyba při načítání z EEO.';
          marker.getPopup().setContent(buildVehiclePopupContent(vehicle, stationAddress, 'error', [], message));
        }
      });

      const markerKey = getVehicleMarkerKey(vehicle);
      if (markerKey !== '') {
        vehicleMarkersRef.current[markerKey] = marker;
      }
    });
  }, [showVehicles, filteredVehiclesOnMap, mapZoom, stationAddressIndex]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (freeAddressMarkerRef.current) {
      freeAddressMarkerRef.current.remove();
      freeAddressMarkerRef.current = null;
    }

    if (!freeAddressPoint || !isValidStationCoord(Number(freeAddressPoint.lat), Number(freeAddressPoint.lng))) {
      return;
    }

    const marker = L.circleMarker([freeAddressPoint.lat, freeAddressPoint.lng], {
      radius: 6,
      color: '#1d4ed8',
      weight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.9,
    }).addTo(map).bindPopup(`
      <div class="mapa-popup">
        <h3>Nalezená adresa</h3>
        <p>${freeAddressPoint.label}</p>
      </div>
    `);

    freeAddressMarkerRef.current = marker;
  }, [freeAddressPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (suppressNextAutoFitRef.current) {
      suppressNextAutoFitRef.current = false;
      return;
    }

    const points = [];
    locatedStations.forEach((station) => {
      const lat = Number(station.latitude);
      const lng = Number(station.longitude);
      if (isValidStationCoord(lat, lng)) {
        points.push([lat, lng]);
      }
    });

    if (showVehicles) {
      filteredVehiclesOnMap.forEach((vehicle) => {
        const lat = parseCoord(vehicle.pos_zs);
        const lng = parseCoord(vehicle.pos_zd);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 48 && lat <= 52 && lng >= 12 && lng <= 19) {
          points.push([lat, lng]);
        }
      });
    }

    if (freeAddressPoint && isValidStationCoord(Number(freeAddressPoint.lat), Number(freeAddressPoint.lng))) {
      points.push([Number(freeAddressPoint.lat), Number(freeAddressPoint.lng)]);
    }

    if (points.length === 0) {
      map.setView(MAP_CENTER, MAP_ZOOM);
      return;
    }

    map.fitBounds(points, { padding: [30, 30], maxZoom: 11 });
  }, [locatedStations, filteredVehiclesOnMap, showVehicles, freeAddressPoint]);

  function focusVehicleOnMap(vehicle) {
    const map = mapRef.current;
    if (!map) return;

    const lat = parseCoord(vehicle.pos_zs);
    const lng = parseCoord(vehicle.pos_zd);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 48 || lat > 52 || lng < 12 || lng > 19) {
      return;
    }

    if (!showVehicles) {
      setShowVehicles(true);
    }

    map.flyTo([lat, lng], 13);
    const markerKey = getVehicleMarkerKey(vehicle);
    const marker = markerKey ? vehicleMarkersRef.current[markerKey] : null;
    if (marker) {
      marker.openPopup();
    }
  }

  function resetMapView() {
    const map = mapRef.current;
    if (!map) return;

    const points = [];
    locatedStations.forEach((station) => {
      const lat = Number(station.latitude);
      const lng = Number(station.longitude);
      if (isValidStationCoord(lat, lng)) {
        points.push([lat, lng]);
      }
    });

    if (showVehicles) {
      filteredVehiclesOnMap.forEach((vehicle) => {
        const lat = parseCoord(vehicle.pos_zs);
        const lng = parseCoord(vehicle.pos_zd);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= 48 && lat <= 52 && lng >= 12 && lng <= 19) {
          points.push([lat, lng]);
        }
      });
    }

    if (points.length === 0) {
      map.setView(MAP_CENTER, MAP_ZOOM);
      return;
    }

    map.fitBounds(points, { padding: [30, 30], maxZoom: 11 });
  }

  async function handleStationClick(station) {
    const map = mapRef.current;
    if (!map) return;

    setSelectedStationId(Number(station.id || 0));

    let lat = Number(station.latitude);
    let lng = Number(station.longitude);

    if (!isValidStationCoord(lat, lng)) {
      logMapDebug('Click: station without coords, trying geocode', {
        id: station?.id,
        mesto: station?.mesto,
        ulice: station?.ulice,
        psc: station?.psc,
      });

      try {
        const geocode = await geocodeStationByAddress(station);
        if (geocode && isValidStationCoord(geocode.lat, geocode.lng)) {
          lat = geocode.lat;
          lng = geocode.lng;
          setStations((prev) => prev.map((item) => {
            if (Number(item.id || 0) !== Number(station.id || 0)) {
              return item;
            }

            return {
              ...item,
              latitude: geocode.lat,
              longitude: geocode.lng,
              position_source: geocode.source,
            };
          }));

          logMapDebug('Click: geocode success', {
            id: station?.id,
            lat: geocode.lat,
            lng: geocode.lng,
            source: geocode.source,
          });
        }
      } catch {
        logMapDebug('Click: geocode exception', { id: station?.id });
      }
    }

    if (!isValidStationCoord(lat, lng)) {
      const stationLabel = String(station.nazev_stanoviste || station.mesto || 'Bez názvu');
      const stationAddress = buildStationAddressText(station);

      L.popup({ closeButton: true })
        .setLatLng(map.getCenter())
        .setContent(buildStationPopupContent(
          station,
          stationAddress || '-',
          'Adresu se nepodařilo dohledat.',
          showVehicles ? filteredVehiclesOnMap : []
        ))
        .openOn(map);

      logMapDebug('Click: no coords after geocode, popup shown', {
        id: station?.id,
        mesto: station?.mesto,
        ulice: station?.ulice,
        psc: station?.psc,
      });
      return;
    }

    map.flyTo([lat, lng], 13);

    const marker = stationMarkersRef.current[station.id];
    if (marker) {
      marker.openPopup();
      return;
    }

    // Fallback: marker may not exist yet right after first geocode.
    const stationLabel = String(station.nazev_stanoviste || station.mesto || 'Bez názvu');
    const stationAddress = buildStationAddressText(station);
    const stationLocalization = buildStationLocalizationLabel(station);
    L.popup({ closeButton: true })
      .setLatLng([lat, lng])
      .setContent(buildStationPopupContent(station, stationAddress || '-', stationLocalization, showVehicles ? filteredVehiclesOnMap : []))
      .openOn(map);
  }

  const localizedCount = locatedStations.length;
  const hasActiveMapFilters =
    search.trim() !== ''
    || statusFilter !== 'aktivni'
    || selectedTypeFilters.length > 0
    || !showVehicles
    || !showVsStations
    || !showServiceStations;

  return (
    <section className="mapa-page">
      <header className="mapa-page-head">
        <div className="section-head mapa-head-row">
          <div>
            <h2 className="title-with-icon">
              <AppIcon name="map" size={20} weight="duotone" />
              <span>Vozidla na mapě</span>
            </h2>
            <p className="muted">
              Mapa zobrazuje města typu VS a vozidla na jednom místě. Body měst se průběžně zpřesňují podle dostupných adres.
            </p>
          </div>

          <div className="icon-actions mapa-head-actions" aria-label="Akce mapy">
            <span className="overview-last-update-pill" title={`Poslední aktualizace: ${formatDateTimeCs(updatedAt, true)}`}>
              Poslední aktualizace: <strong>{formatDateTimeCs(updatedAt, true)}</strong>
            </span>

            <button
              className="icon-action-btn"
              type="button"
              onClick={resetMapFilters}
              disabled={!hasActiveMapFilters}
              title="Resetovat filtry mapy"
              aria-label="Resetovat filtry mapy"
            >
              <AppIcon name="resetFilters" size={20} weight="regular" />
            </button>

            <button
              className="icon-action-btn"
              type="button"
              onClick={resetMapView}
              title="Resetovat pohled mapy"
              aria-label="Resetovat pohled mapy"
            >
              <AppIcon name="resetMapView" size={20} weight="regular" />
            </button>

            <button
              className={`icon-action-btn icon-action-btn-primary${syncing ? ' mapa-head-syncing' : ''}`}
              type="button"
              onClick={handleRefreshFromWebdispecink}
              disabled={syncing || loading}
              title="Aktualizovat polohy z Webdispečinku"
              aria-label="Aktualizovat polohy z Webdispečinku"
            >
              <AppIcon name="sync" size={20} weight="regular" />
            </button>
          </div>
        </div>
      </header>

      <section className="mapa-v2-card" aria-label="Mapa vozidel a VS měst">
        <div className="mapa-v2-toolbar" ref={mapToolbarRef}>
          <label className="overview-search-wrap mapa-v2-search" htmlFor="map-search">
            <input
              id="map-search"
              className="search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hledat město nebo adresu"
            />
            {search ? (
              <button
                className="overview-search-clear-icon"
                type="button"
                onClick={() => setSearch('')}
                aria-label="Vymazat fulltext"
                title="Vymazat"
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </label>

          <button className="table-pager-btn" type="button" onClick={() => mapRef.current?.zoomIn()}>+</button>
          <button className="table-pager-btn" type="button" onClick={() => mapRef.current?.zoomOut()}>-</button>

          <label className="mapa-v2-select-wrap" htmlFor="map-status-filter">
            <span>Stav</span>
            <select
              id="map-status-filter"
              className="mapa-v2-select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <details
            className="overview-multifilter"
            open={openFilterKey === 'types'}
            onToggle={(event) => setOpenFilterKey(event.currentTarget.open ? 'types' : null)}
          >
            <summary>Typ vozidla: {selectedLabel(selectedTypeFilters, 'vše')}</summary>
            <div className="overview-multifilter-menu">
              {typeOptions.map((typeValue) => (
                <label key={`map-type-${typeValue}`} className="overview-multifilter-option">
                  <input
                    type="checkbox"
                    checked={selectedTypeFilters.includes(typeValue)}
                    onChange={() => toggleTypeFilter(typeValue)}
                  />
                  <span>{typeValue}</span>
                </label>
              ))}
            </div>
          </details>

          <label className="mapa-v2-toggle">
            <input type="checkbox" checked={showVehicles} onChange={(event) => setShowVehicles(event.target.checked)} />
            <span>Zobrazit vozidla</span>
          </label>

          <label className="mapa-v2-toggle">
            <input type="checkbox" checked={showVsStations} onChange={(event) => setShowVsStations(event.target.checked)} />
            <span>Zobrazit VS</span>
          </label>

          <label className="mapa-v2-toggle">
            <input type="checkbox" checked={showServiceStations} onChange={(event) => setShowServiceStations(event.target.checked)} />
            <span>Zobrazit servisy</span>
          </label>
        </div>

        {syncing ? <SyncGate syncSeconds={syncSeconds} /> : null}

        {syncMessage && syncMessageVisible ? (
          <div className="status-box sync-message-box" role="status" aria-live="polite">
            <span>{syncMessage}</span>
            <button
              type="button"
              className="sync-message-close"
              onClick={() => setSyncMessageVisible(false)}
              aria-label="Skrýt informační hlášku"
              title="Skrýt"
            >
              ×
            </button>
          </div>
        ) : null}

        <div className="mapa-v2-layout">
          <aside className="mapa-v2-sidebar" aria-label="Seznam VS měst">
            <div className="mapa-v2-sidebar-head">
              <span className="mapa-v2-badge">
                <AppIcon name="map" size={16} weight="duotone" />
                Stanoviště
              </span>
              <div className="mapa-v2-meta">
                <span>{filteredStations.length} záznamů</span>
                <span>{localizedCount} na mapě</span>
                <span>{showVehicles ? filteredVehiclesOnMap.length : 0} vozidel</span>
              </div>
            </div>

            {loading ? <p className="mapa-v2-info">Načítám mapová data...</p> : null}
            {!loading && error ? <p className="mapa-v2-error">{error}</p> : null}

            <div className="mapa-v2-stations-list">
              {filteredStations.map((station) => {
                const stationAddress = buildStationAddressText(station);
                const stationLabel = String(station.nazev_stanoviste || station.mesto || station.stanoviste || 'Bez názvu');
                const isActive = Number(station.id || 0) === selectedStationId;
                const stationType = normalizeStationTyp(station.typ);
                const stationTypeClass = stationType === 'VS'
                  ? 'is-vs'
                  : stationType === 'Servis'
                    ? 'is-servis'
                    : 'is-mimo';

                return (
                  <button
                    key={station.id || `${station.mesto || station.stanoviste}-${station.ulice}`}
                    type="button"
                    className={`mapa-v2-station-item${isActive ? ' active' : ''}`}
                    onClick={() => handleStationClick(station)}
                  >
                    <div className="mapa-v2-station-title-row">
                      <strong>{stationLabel}</strong>
                      <span className={`mapa-v2-station-type-badge ${stationTypeClass}`}>{stationType}</span>
                    </div>
                    <div className="mapa-v2-station-address">{stationAddress || '-'}</div>
                  </button>
                );
              })}

              {!loading && filteredStations.length === 0 ? (
                <p className="mapa-v2-info">Žádná města neodpovídají filtru.</p>
              ) : null}
            </div>
          </aside>

          <div className="mapa-v2-map-wrap">
            <div ref={mapContainerRef} className="mapa-v2-map" role="img" aria-label="Interaktivní mapa VS měst a vozidel" />
          </div>
        </div>
      </section>
    </section>
  );
}
