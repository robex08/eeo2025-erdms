import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { STATIONS } from './data/stations';

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

const normalizeDistrictName = (value) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const DISTRICTS_NORMALIZED = DISTRICTS.map(normalizeDistrictName);
const DISTRICT_FILL_OPACITY = 0.6;
let boundaryGeoJsonCache = null;
const STATION_LABEL_MIN_ZOOM_DESKTOP = 10.25;
const STATION_LABEL_MIN_ZOOM_MOBILE = 9.4;
const DISTRICT_LABEL_MIN_ZOOM_DESKTOP = 8.95;
const DISTRICT_LABEL_MIN_ZOOM_MOBILE = 8.95;

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
const PRAGUE_LABEL_LATLNG = [50.0635, 14.4618];

const isTargetDistrict = (name) => {
  const normalized = normalizeDistrictName(name);
  return DISTRICTS_NORMALIZED.some((okres) => normalized.includes(okres));
};

const formatDistrictLabel = (label) => {
  const normalized = normalizeDistrictName(label);
  if (normalized.includes('praha-zapad')) return 'Praha<br/>západ';
  if (normalized.includes('praha-vychod')) return 'Praha<br/>východ';
  if (normalized.includes('mlada boleslav')) return 'Mladá<br/>Boleslav';
  return label;
};

const getDistrictLabelOffset = (label) => {
  const normalized = normalizeDistrictName(label);
  const match = Object.entries(DISTRICT_LABEL_OFFSETS).find(([key]) => normalized.includes(key));
  return match ? match[1] : [0, 0];
};

const getDistrictLabelGeoOffset = (label) => {
  const normalized = normalizeDistrictName(label);
  const match = Object.entries(DISTRICT_LABEL_GEO_OFFSETS).find(([key]) =>
    normalized.includes(key),
  );
  return match ? match[1] : null;
};

const getDistrictColor = (okresName) => {
  if (!okresName) return '#facc15';
  const name = okresName.trim();

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
};

const detectNameProperty = (features) => {
  const testDistricts = ['Benešov', 'Kladno', 'Příbram'];

  for (const feature of features) {
    if (!feature.properties) continue;

    for (const [key, value] of Object.entries(feature.properties)) {
      if (typeof value === 'string' && testDistricts.some((td) => value.includes(td))) {
        return key;
      }
    }
  }

  return 'name';
};

const getFeatureName = (feature, nameProperty = 'name') => {
  const fromProperties = feature?.properties?.[nameProperty];
  if (typeof fromProperties === 'string' && fromProperties.trim()) return fromProperties;

  const fromTopLevel = feature?.[nameProperty];
  if (typeof fromTopLevel === 'string' && fromTopLevel.trim()) return fromTopLevel;

  const directNameFromProperties = feature?.properties?.name;
  if (typeof directNameFromProperties === 'string' && directNameFromProperties.trim()) {
    return directNameFromProperties;
  }

  return '';
};

const aggregateCrews = (crews) => {
  const counts = crews.reduce((acc, curr) => {
    acc[curr] = (acc[curr] || 0) + 1;
    return acc;
  }, {});

  const crewTypeLabel = (type) => {
    if (type === 'BOAT') return 'člun';
    return type;
  };

  const order = ['RLP', 'RV', 'RZP', 'BOAT'];
  return Object.entries(counts)
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([type, count]) => ({ type, count, label: `${count}x ${crewTypeLabel(type)}` }));
};

const formatStationLabel = (city) => {
  const clean = city.trim();
  const parts = clean.split(/\s+/);

  // Krátké názvy necháme na jednom řádku.
  if (parts.length <= 1 || clean.length <= 10) return clean;

  // Delší názvy zalomíme do dvou řádků co nejvíce vyváženě.
  let bestIndex = 1;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 1; i < parts.length; i += 1) {
    const first = parts.slice(0, i).join(' ');
    const second = parts.slice(i).join(' ');
    const diff = Math.abs(first.length - second.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }

  const firstLine = parts.slice(0, bestIndex).join(' ');
  const secondLine = parts.slice(bestIndex).join(' ');
  return `${firstLine}<br/>${secondLine}`;
};

const buildNavigationDestination = (station) => {
  const city = station?.city?.trim() || '';
  const address = station?.address?.trim() || '';

  // Preferujeme textovou adresu (větší šance na správný bod v Google Maps).
  if (address) return `${address}, ${city}, Česká republika`;
  if (city) return `${city}, Česká republika`;

  // Fallback na souřadnice, pokud by adresa chyběla.
  if (Array.isArray(station?.coords) && station.coords.length === 2) {
    return `${station.coords[0]},${station.coords[1]}`;
  }

  return '';
};

const applyStationLabelScale = (map) => {
  const zoom = map.getZoom();
  const isMobile = window.innerWidth < 768;
  const stationLabelMinZoom = isMobile
    ? STATION_LABEL_MIN_ZOOM_MOBILE
    : STATION_LABEL_MIN_ZOOM_DESKTOP;
  const stationLabelsVisible = zoom >= stationLabelMinZoom;
  const minZoom = 7;
  const maxZoom = 13;
  const minFontSize = 12;
  const maxFontSize = 18;

  const t = Math.max(0, Math.min(1, (zoom - minZoom) / (maxZoom - minZoom)));
  const fontSize = minFontSize + (maxFontSize - minFontSize) * t;
  const paddingY = 3 + 3 * t;
  const paddingX = 7 + 3 * t;

  const container = map.getContainer();
  container.style.setProperty('--station-label-font-size', `${fontSize.toFixed(1)}px`);
  container.style.setProperty('--station-label-padding-y', `${paddingY.toFixed(1)}px`);
  container.style.setProperty('--station-label-padding-x', `${paddingX.toFixed(1)}px`);
  container.style.setProperty('--station-label-opacity', stationLabelsVisible ? '1' : '0');
  container.style.setProperty('--station-label-visibility', stationLabelsVisible ? 'visible' : 'hidden');
};

const applyDistrictLabelScale = (map) => {
  const zoom = map.getZoom();
  const isMobile = window.innerWidth < 768;
  const districtLabelMinZoom = isMobile
    ? DISTRICT_LABEL_MIN_ZOOM_MOBILE
    : DISTRICT_LABEL_MIN_ZOOM_DESKTOP;
  const districtLabelsVisible = zoom >= districtLabelMinZoom;
  const minZoom = 7;
  const maxZoom = 13;
  const minDistrictFontSize = 13.75;
  const maxDistrictFontSize = 25;
  const t = Math.max(0, Math.min(1, (zoom - minZoom) / (maxZoom - minZoom)));
  const districtFontSize =
    minDistrictFontSize + (maxDistrictFontSize - minDistrictFontSize) * t;

  const labels = map.getContainer().querySelectorAll('.district-label-tooltip');
  labels.forEach((el) => {
    const isPragueCityLabel = el.classList.contains('district-label-tooltip--praha-city');
    const scaledSize = isPragueCityLabel ? districtFontSize * 1.5 : districtFontSize;
    el.style.fontSize = `${scaledSize.toFixed(1)}px`;
  });

  map
    .getContainer()
    .style.setProperty('--district-label-font-size', `${districtFontSize.toFixed(1)}px`);
  map
    .getContainer()
    .style.setProperty('--district-label-opacity', districtLabelsVisible ? '1' : '0');
  map
    .getContainer()
    .style.setProperty('--district-label-visibility', districtLabelsVisible ? 'visible' : 'hidden');
};

const getMarkerScale = (zoom) => {
  const minZoom = 7;
  const maxZoom = 13;
  const minDotSize = 14;
  const maxDotSize = 24;
  const minBorder = 2;
  const maxBorder = 3;
  const minPingSize = 24;
  const maxPingSize = 34;

  const t = Math.max(0, Math.min(1, (zoom - minZoom) / (maxZoom - minZoom)));
  const dotSize = minDotSize + (maxDotSize - minDotSize) * t;
  const dotBorder = minBorder + (maxBorder - minBorder) * t;
  const pingSize = minPingSize + (maxPingSize - minPingSize) * t;

  return { dotSize, dotBorder, pingSize };
};

const App = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedStation, setSelectedStation] = useState(null);
  const [legendOpen, setLegendOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 768;
  });
  const [districtFillVisible, setDistrictFillVisible] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [loadingBoundaries, setLoadingBoundaries] = useState(true);
  const [mapZoom, setMapZoom] = useState(9);
  const [addressSearchOpen, setAddressSearchOpen] = useState(false);
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [addressSearchError, setAddressSearchError] = useState('');
  const [addressSearching, setAddressSearching] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const districtLabelLayerRef = useRef(null);
  const boundaryLoadIdRef = useRef(0);
  const markersRef = useRef({});
  const selectedStationIdRef = useRef(null);
  const stationItemRefs = useRef({});
  const lightTilesRef = useRef(null);
  const standardTilesRef = useRef(null);
  const addressMarkerRef = useRef(null);

  useEffect(() => {
    selectedStationIdRef.current = selectedStation?.id ?? null;
  }, [selectedStation]);

  const filteredStations = useMemo(
    () =>
      STATIONS.filter((station) => {
        const normalizedSearch = normalizeDistrictName(searchTerm);
        const matchesSearch =
          !normalizedSearch ||
          normalizeDistrictName(station.city).includes(normalizedSearch) ||
          normalizeDistrictName(station.address).includes(normalizedSearch);

        let matchesType = true;
        if (filterType !== 'ALL') {
          matchesType = station.crews.includes(filterType);
        }

        return matchesSearch && matchesType;
      }).sort((a, b) => a.city.localeCompare(b.city, 'cs', { sensitivity: 'base' })),
    [searchTerm, filterType],
  );

  const crewTotals = useMemo(() => {
    const totals = { RV: 0, RLP: 0, RZP: 0 };
    STATIONS.forEach((station) => {
      station.crews.forEach((crew) => {
        if (crew in totals) totals[crew] += 1;
      });
    });
    return totals;
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      minZoom: 7,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      wheelPxPerZoomLevel: 140,
    }).setView([49.95, 14.6], 9);

    map.attributionControl.setPrefix(false);

    // Zoom controls are handled by custom buttons in the UI.

    lightTilesRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      },
    );

    standardTilesRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    });

    lightTilesRef.current.addTo(map);

    applyStationLabelScale(map);
    applyDistrictLabelScale(map);
    map.on('zoom', () => {
      applyStationLabelScale(map);
      applyDistrictLabelScale(map);
    });
    map.on('zoomend', () => {
      applyDistrictLabelScale(map);
      setMapZoom(map.getZoom());
    });

    mapInstanceRef.current = map;

    const syncMapLayout = () => {
      if (!mapInstanceRef.current) return;
      mapInstanceRef.current.invalidateSize({ pan: false, debounceMoveend: true });
      applyStationLabelScale(mapInstanceRef.current);
      applyDistrictLabelScale(mapInstanceRef.current);
    };

    const syncTimers = [120, 420, 1000].map((delay) => window.setTimeout(syncMapLayout, delay));
    window.addEventListener('resize', syncMapLayout);
    window.addEventListener('orientationchange', syncMapLayout);
    window.addEventListener('pageshow', syncMapLayout);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncMapLayout();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      syncTimers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', syncMapLayout);
      window.removeEventListener('orientationchange', syncMapLayout);
      window.removeEventListener('pageshow', syncMapLayout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
      boundaryLayerRef.current = null;
      districtLabelLayerRef.current = null;
      lightTilesRef.current = null;
      standardTilesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const currentZoom = mapInstanceRef.current.getZoom();
    const { dotSize, dotBorder } = getMarkerScale(currentZoom);

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    filteredStations.forEach((station) => {
      let markerColor = 'bg-slate-900';
      let ringColor = 'border-white';

      if (station.city === 'Kladno') {
        markerColor = 'bg-red-600';
      } else if (station.type === 'partner') {
        markerColor = 'bg-green-600';
      } else if (station.type === 'seasonal') {
        markerColor = 'bg-blue-600';
      }

      const isMainStation = station.type === 'main';
      const isPriorityStation = station.city === 'Říčany';
      const mainScale = isMainStation ? 1.2 : 1;
      const priorityScale = isPriorityStation ? 1.2 : 1;
      const localDotSize = dotSize * mainScale * priorityScale;
      const localDotBorder = dotBorder * (isMainStation || isPriorityStation ? 1.15 : 1);
      const iconCanvasSize = localDotSize + 10;
      const iconAnchor = iconCanvasSize / 2;

      const iconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="${markerColor} rounded-full ${ringColor} shadow-md z-10"
               style="width: ${localDotSize.toFixed(1)}px; height: ${localDotSize.toFixed(1)}px; border-width: ${localDotBorder.toFixed(2)}px;"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-div-icon bg-transparent border-0',
        html: iconHtml,
        iconSize: [iconCanvasSize, iconCanvasSize],
        iconAnchor: [iconAnchor, iconAnchor],
      });

      const crewsHtml = aggregateCrews(station.crews)
        .map(
          (crew) =>
            `<span class="map-popup-crew ${
              crew.type === 'RZP'
                ? 'map-popup-crew--rzp'
                : crew.type === 'RV' || crew.type === 'RLP'
                  ? 'map-popup-crew--doctor'
                  : 'map-popup-crew--other'
            }">${crew.label}</span>`,
        )
        .join('');

      const marker = L.marker(station.coords, { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="map-popup-card" role="button" tabindex="0" aria-label="Zobrazit detail stanoviště ${station.city}">
            <h3 class="map-popup-title">${station.city}</h3>
            <p class="map-popup-address">${station.address}</p>
            <div class="map-popup-crews">${crewsHtml}</div>
          </div>
        `)
        .bindTooltip(formatStationLabel(station.city), {
          permanent: true,
          direction: 'right',
          offset: [10, 0],
          interactive: false,
          className: 'station-label-tooltip',
        });

      marker.on('click', () => {
        const isMobile = window.innerWidth < 768;

        if (!isMobile) {
          setSelectedStation(station);
          return;
        }

        const isSecondTapSameStation = selectedStationIdRef.current === station.id;
        setSelectedStation(station);

        if (isSecondTapSameStation) {
          setActiveTab('list');
        } else {
          setActiveTab('map');
        }
      });

      marker.on('popupopen', (event) => {
        const popupEl = event.popup?.getElement();
        const popupCardEl = popupEl?.querySelector('.map-popup-card');
        if (!popupCardEl) return;

        popupCardEl.style.cursor = 'pointer';
        popupCardEl.onclick = () => {
          setSelectedStation(station);
          if (window.innerWidth < 768) setActiveTab('list');
        };
      });

      markersRef.current[station.id] = marker;
    });
  }, [filteredStations, mapZoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const renderData = (data) => {
      if (!data || !data.features?.length) return 0;

      const nameProperty = detectNameProperty(data.features);
      let filteredFeatures = data.features.filter((feature) => {
        const districtName = getFeatureName(feature, nameProperty);
        return districtName && isTargetDistrict(districtName);
      });

      // Fallback: některé datasety mohou mít netypické názvy,
      // ale kódy okresů pro Středočeský kraj bývají 3201–3212.
      if (!filteredFeatures.length) {
        filteredFeatures = data.features.filter((feature) => {
          const nationalCode = String(feature?.nationalCode || feature?.properties?.nationalCode || '');
          return /^32(0[1-9]|1[0-2])$/.test(nationalCode);
        });
      }

      if (!filteredFeatures.length) return 0;

      if (boundaryLayerRef.current) {
        boundaryLayerRef.current.remove();
      }


      if (districtLabelLayerRef.current) {
        districtLabelLayerRef.current.remove();
      }

      const districtLabelLayer = L.layerGroup().addTo(map);
      districtLabelLayerRef.current = districtLabelLayer;

      const renderer = L.canvas({ padding: 0.5 });

      boundaryLayerRef.current = L.geoJSON(
        { type: 'FeatureCollection', features: filteredFeatures },
        {
          renderer,
          style: (feature) => ({
            fillColor: getDistrictColor(getFeatureName(feature, nameProperty)),
            weight: 3,
            opacity: 1,
            color: '#000000',
            dashArray: '',
            fillOpacity: districtFillVisible ? DISTRICT_FILL_OPACITY : 0,
          }),
          onEachFeature: (feature, layer) => {
            const label = getFeatureName(feature, nameProperty);
            const shortLabel = label.replace('Okres ', '');
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
        },
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

      applyDistrictLabelScale(map);

      return filteredFeatures.length;
    };

    const loadRealBoundaries = async () => {
      const loadId = ++boundaryLoadIdRef.current;
      setLoadingBoundaries(true);
      setMapError(null);

      const baseUrlRaw = import.meta.env.BASE_URL || '/';
      const normalizedBaseUrl = baseUrlRaw.endsWith('/') ? baseUrlRaw : `${baseUrlRaw}/`;
      const reducedGeoJsonUrl = `${window.location.origin}${normalizedBaseUrl}data/okresy-stc-reduced.geojson`;
      const fallbackGeoJsonUrl = `${window.location.origin}${normalizedBaseUrl}data/okresy-stc.geojson`;

      const fetchBoundaryData = async (url, attempts = 2) => {
        let lastError;

        for (let attempt = 1; attempt <= attempts; attempt += 1) {
          try {
            const response = await fetch(url, { cache: 'force-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
          } catch (error) {
            lastError = error;
            if (attempt < attempts) {
              await new Promise((resolve) => window.setTimeout(resolve, 120));
            }
          }
        }

        throw lastError;
      };

      try {
        const data =
          boundaryGeoJsonCache ||
          (await fetchBoundaryData(reducedGeoJsonUrl).catch(() =>
            fetchBoundaryData(fallbackGeoJsonUrl),
          ));
        if (!boundaryGeoJsonCache) boundaryGeoJsonCache = data;
        const rendered = renderData(data);

        if (loadId !== boundaryLoadIdRef.current) return;

        if (rendered === 0) {
          throw new Error('Žádné okresy nenalezeny v lokálním souboru.');
        }

        setMapError(null);
      } catch (error) {
        if (loadId !== boundaryLoadIdRef.current) return;
        console.error('Chyba při načítání hranic:', error);
        // Pokud už jsou hranice vykreslené, nechceme ukazovat falešnou chybu.
        if (!boundaryLayerRef.current) {
          setMapError('Nepodařilo se načíst nebo vyfiltrovat okresy z lokálního JSON.');
        }
      } finally {
        if (loadId !== boundaryLoadIdRef.current) return;
        setLoadingBoundaries(false);
      }
    };

    loadRealBoundaries();
  }, []);

  const handleStationClick = (station) => {
    setSelectedStation(station);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(station.coords, 13);
      const marker = markersRef.current[station.id];
      if (marker) marker.openPopup();
    }
    if (window.innerWidth < 768) setActiveTab('map');
  };

  const openNavigation = (station) => {
    const destination = buildNavigationDestination(station);
    if (!destination) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      '_blank',
    );
  };

  const openWazeNavigation = (station) => {
    const coords = Array.isArray(station?.coords) ? station.coords : null;
    if (coords?.length === 2) {
      const [lat, lon] = coords;
      window.open(`https://waze.com/ul?ll=${lat},${lon}&navigate=yes`, '_blank');
      return;
    }

    const destination = buildNavigationDestination(station);
    if (!destination) return;
    window.open(`https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`, '_blank');
  };

  const handleFitMapToCenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (boundaryLayerRef.current) {
      const bounds = boundaryLayerRef.current.getBounds();
      if (bounds?.isValid()) {
        map.fitBounds(bounds, { padding: [18, 18] });
        return;
      }
    }

    map.setView([49.95, 14.6], 9);
  };

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.zoomIn();
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.zoomOut();
  };

  const handleAddressSearch = async (event) => {
    event.preventDefault();
    const map = mapInstanceRef.current;
    if (!map) return;

    const query = addressSearchTerm.trim();
    if (!query) return;

    setAddressSearching(true);
    setAddressSearchError('');

    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('q', query);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Chyba vyhledávání');

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        setAddressSearchError('Adresa nenalezena.');
        return;
      }

      const lat = Number.parseFloat(data[0].lat);
      const lon = Number.parseFloat(data[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setAddressSearchError('Neplatné souřadnice.');
        return;
      }

      if (addressMarkerRef.current) addressMarkerRef.current.remove();
      addressMarkerRef.current = L.circleMarker([lat, lon], {
        radius: 6,
        color: '#1d4ed8',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.9,
      }).addTo(map);

      const addr = data[0].address || {};
      const houseNumber = addr.house_number || '';
      const road = addr.road || addr.pedestrian || addr.footway || '';
      const streetLine = [road, houseNumber].filter(Boolean).join(' ');
      const city = addr.city || addr.town || addr.village || '';
      const rawDistrict = addr.city_district || addr.suburb || addr.neighbourhood || '';
      const cityDistrict = rawDistrict.replace(/^obvod\s+/i, '').trim();
      const suburb = addr.suburb || addr.neighbourhood || '';
      const postcode = addr.postcode || '';
      const cityLine =
        city === 'Praha' && cityDistrict.startsWith('Praha ')
          ? [
              cityDistrict,
              suburb && suburb !== cityDistrict ? suburb : '',
            ]
              .filter(Boolean)
              .join(' - ')
          : [city, cityDistrict].filter(Boolean).join(' - ');
      const displayAddress =
        [streetLine, [postcode, cityLine].filter(Boolean).join(' ')].filter(Boolean).join(', ') ||
        data[0].display_name ||
        query;
      const destination = `${lat},${lon}`;
      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destination,
      )}`;
      const wazeUrl = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;

      addressMarkerRef.current
        .bindPopup(
          `
          <div class="map-popup-card" aria-label="Vyhledaná adresa">
            <h3 class="map-popup-title">Vyhledaná adresa</h3>
            <p class="map-popup-address">${displayAddress}</p>
            <div class="map-popup-crews" style="display:flex; gap:6px; flex-wrap:wrap;">
              <a
                href="${googleUrl}"
                target="_blank"
                rel="noreferrer"
                class="map-popup-crew map-popup-crew--rzp"
                aria-label="Navigovat (Google Maps)"
                title="Navigovat (Google Maps)"
                style="display:inline-flex; align-items:center; justify-content:center;"
              >
                <span style="display:inline-flex; align-items:center;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                  </svg>
                </span>
              </a>
              <a
                href="${wazeUrl}"
                target="_blank"
                rel="noreferrer"
                class="map-popup-crew map-popup-crew--other"
                aria-label="Navigovat (Waze)"
                title="Navigovat (Waze)"
                style="display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:11px;"
              >
                W
              </a>
            </div>
          </div>
          `,
        )
        .openPopup();

      if (districtFillVisible) {
        setDistrictFillVisible(false);
      }

      map.flyTo([lat, lon], Math.max(map.getZoom(), 13), { duration: 0.7 });
    } catch (error) {
      setAddressSearchError('Vyhledávání se nepodařilo.');
    } finally {
      setAddressSearching(false);
    }
  };

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 280);

    return () => window.clearTimeout(timer);
  }, [activeTab, sidebarOpen]);

  useEffect(() => {
    if (!boundaryLayerRef.current) return;
    boundaryLayerRef.current.setStyle({
      fillOpacity: districtFillVisible ? DISTRICT_FILL_OPACITY : 0,
    });

    const map = mapInstanceRef.current;
    if (!map || !lightTilesRef.current || !standardTilesRef.current) return;

    if (districtFillVisible) {
      if (map.hasLayer(standardTilesRef.current)) {
        map.removeLayer(standardTilesRef.current);
      }
      if (!map.hasLayer(lightTilesRef.current)) {
        lightTilesRef.current.addTo(map);
      }
    } else {
      if (map.hasLayer(lightTilesRef.current)) {
        map.removeLayer(lightTilesRef.current);
      }
      if (!map.hasLayer(standardTilesRef.current)) {
        standardTilesRef.current.addTo(map);
      }
    }
  }, [districtFillVisible]);

  useEffect(() => {
    if (window.innerWidth >= 768) return;
    if (activeTab !== 'list') return;
    if (!selectedStation?.id) return;

    const target = stationItemRefs.current[selectedStation.id];
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeTab, selectedStation, filteredStations]);

  return (
    <div
      data-build="2026-02-13-01"
      className="flex flex-col h-[100dvh] min-h-[100dvh] bg-gray-50 text-slate-800 font-sans overflow-hidden"
    >
      <header className="bg-blue-900 text-white p-3 shadow-lg flex items-center justify-between z-20 h-16 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-md bg-white">
            <img
              src={`${import.meta.env.BASE_URL}logo-ZZS.png`}
              alt="Logo ZZS Středočeského kraje"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">ZZS Středočeského kraje, p.o.</h1>
            <p className="text-xs text-blue-200">Interaktivní mapa stanovišť</p>
          </div>
        </div>
        <a
          href="https://www.zachranka.cz/o-nas/"
          className="text-xs text-blue-200 hover:text-white underline hidden sm:block"
        >
          Zpět na web ZZS SK
        </a>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside
          className={`
            absolute inset-y-0 left-0 md:relative md:inset-auto bg-white shadow-xl transition-all duration-300 ease-in-out flex flex-col z-30 border-r border-gray-200
            w-full ${sidebarOpen ? 'md:w-80' : 'md:w-0'}
            ${activeTab === 'list' ? 'pointer-events-auto' : 'pointer-events-none md:pointer-events-auto'}
            ${
              activeTab === 'list'
                ? 'translate-x-0'
                : sidebarOpen
                  ? '-translate-x-full md:translate-x-0'
                  : '-translate-x-full md:translate-x-0'
            }
          `}
          style={{ overflow: sidebarOpen ? 'visible' : 'hidden' }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex absolute -right-3 top-20 bg-white border border-gray-200 text-gray-600 rounded-full p-1 shadow-md hover:bg-gray-50 z-50 items-center justify-center w-6 h-6"
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>


          <div className={`flex flex-col flex-1 min-h-0 ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
            <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
              <p className="text-sm font-semibold text-slate-800">Seznam stanovišť</p>
              <button
                onClick={() => setActiveTab('map')}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-600 bg-white"
                aria-label="Zavřít seznam"
                title="Zavřít seznam"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 bg-white">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Hledat stanoviště..."
                  className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 rounded"
                    aria-label="Vymazat vyhledávání"
                    title="Vymazat"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition ${
                    filterType === 'ALL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
                  }`}
                >
                  Vše
                </button>
                <button
                  onClick={() => setFilterType('RV')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition ${
                    filterType === 'RV' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'
                  }`}
                >
                  RV
                </button>
                <button
                  onClick={() => setFilterType('RLP')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition ${
                    filterType === 'RLP' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100'
                  }`}
                >
                  RLP
                </button>
                <button
                  onClick={() => setFilterType('RZP')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded transition ${
                    filterType === 'RZP' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                  }`}
                >
                  RZP
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50/50">
              <div className="p-2 space-y-2">
                {filteredStations.map((station) => (
                  <div
                    key={station.id}
                    ref={(node) => {
                      if (node) {
                        stationItemRefs.current[station.id] = node;
                      } else {
                        delete stationItemRefs.current[station.id];
                      }
                    }}
                    onClick={() => handleStationClick(station)}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md bg-white ${
                      selectedStation?.id === station.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
                      <div className="flex items-start gap-1.5">
                        <h3 className="font-bold text-sm text-gray-800">{station.city}</h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openNavigation(station);
                          }}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 self-start"
                          aria-label={`Navigovat ${station.city}`}
                          title="Navigovat (Google Maps)"
                        >
                          <Navigation className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openWazeNavigation(station);
                          }}
                          className="inline-flex items-center justify-center h-6 px-1.5 rounded-full border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-bold leading-none self-start"
                          aria-label={`Waze navigace ${station.city}`}
                          title="Navigovat (Waze)"
                        >
                          W
                        </button>
                      </div>
                      <div className="flex items-center justify-start sm:justify-end gap-1 flex-wrap sm:flex-nowrap sm:ml-2">
                        {aggregateCrews(station.crews).map((crew) => (
                          <span
                            key={`${station.id}-${crew.type}`}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                              crew.type === 'RZP'
                                ? 'bg-blue-100 text-blue-800'
                                : crew.type === 'RV' || crew.type === 'RLP'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {crew.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-snug break-words">{station.address}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {selectedStation && sidebarOpen && (
            <div className="bg-white border-t p-4 shadow-up z-20">
              <div className="flex justify-between items-start mb-2">
                <h2 className="font-bold text-lg text-blue-900">{selectedStation.city}</h2>
                <button onClick={() => setSelectedStation(null)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-600 flex items-center gap-2 mb-3">
                <MapPin className="w-3 h-3" />
                {selectedStation.address}
              </p>
              <button
                onClick={() => openNavigation(selectedStation)}
                className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4" /> Navigovat
              </button>
            </div>
          )}
        </aside>

        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden md:flex absolute left-4 top-4 z-20 bg-white p-2 rounded-lg shadow-md border border-gray-200"
          >
            <Menu className="w-5 h-5 text-blue-900" />
          </button>
        )}

        <main className="flex-1 min-w-0 relative z-0">
          <div ref={mapContainerRef} className="w-full h-full map-local-bg" />

          <div className="absolute top-24 left-4 z-[550] flex flex-col items-start gap-2">
            <button
              onClick={handleZoomIn}
              className="bg-white/95 backdrop-blur border border-gray-200 text-slate-800 p-2 rounded-lg shadow-md hover:bg-white w-9 h-9 flex items-center justify-center"
              aria-label="Přiblížit"
              title="Přiblížit"
            >
              <span className="text-base leading-none">+</span>
            </button>

            <button
              onClick={handleZoomOut}
              className="bg-white/95 backdrop-blur border border-gray-200 text-slate-800 p-2 rounded-lg shadow-md hover:bg-white w-9 h-9 flex items-center justify-center"
              aria-label="Oddálit"
              title="Oddálit"
            >
              <span className="text-base leading-none">−</span>
            </button>

            <button
              onClick={handleFitMapToCenter}
              className="bg-white/95 backdrop-blur border border-gray-200 text-slate-800 p-2 rounded-lg shadow-md hover:bg-white w-9 h-9 flex items-center justify-center"
              aria-label="Vycentrovat mapu"
              title="Vycentrovat mapu"
            >
              <LocateFixed className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDistrictFillVisible((prev) => !prev)}
              className="bg-white/95 backdrop-blur border border-gray-200 text-slate-800 p-2 rounded-lg shadow-md hover:bg-white w-9 h-9 flex items-center justify-center"
              aria-label={districtFillVisible ? 'Skrýt výplň okresů' : 'Zobrazit výplň okresů'}
              title={districtFillVisible ? 'Skrýt výplň okresů' : 'Zobrazit výplň okresů'}
            >
              {districtFillVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <div className="flex items-center justify-end gap-2">
              {addressSearchOpen && (
                <form
                  onSubmit={handleAddressSearch}
                  className="bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-md px-2 py-1.5 flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Hledat adresu..."
                    className="w-48 sm:w-60 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    value={addressSearchTerm}
                    onChange={(e) => setAddressSearchTerm(e.target.value)}
                    aria-label="Vyhledat adresu"
                  />
                  {addressSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setAddressSearchTerm('')}
                      className="text-slate-400 hover:text-slate-700"
                      aria-label="Vymazat adresu"
                      title="Vymazat"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={addressSearching}
                    className="text-slate-700 hover:text-slate-900"
                    aria-label="Vyhledat"
                    title="Vyhledat"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              <button
                onClick={() => {
                  setAddressSearchOpen((prev) => !prev);
                  setAddressSearchError('');
                }}
                className="bg-white/95 backdrop-blur border border-gray-200 text-slate-800 p-2 rounded-lg shadow-md hover:bg-white w-9 h-9 flex items-center justify-center"
                aria-label={addressSearchOpen ? 'Skrýt vyhledávání adresy' : 'Vyhledat adresu'}
                title={addressSearchOpen ? 'Skrýt vyhledávání adresy' : 'Vyhledat adresu'}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {addressSearchOpen && addressSearchError && (
              <div className="text-xs text-red-600 bg-white/95 border border-red-100 rounded-md px-2 py-1 shadow">
                {addressSearchError}
              </div>
            )}
          </div>

          <div className="absolute top-4 right-4 z-[500] flex flex-col items-end gap-2">
            {!legendOpen && (
              <button
                onClick={() => setLegendOpen(true)}
                className="bg-white/95 backdrop-blur border border-gray-200 text-slate-800 px-3 py-1.5 rounded-lg shadow-md text-xs font-semibold hover:bg-white"
              >
                Zobrazit legendu
              </button>
            )}

            {legendOpen && (
              <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl shadow-lg p-3 w-[270px] text-xs text-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-900">Legenda</h3>
                  <button
                    onClick={() => setLegendOpen(false)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                    aria-label="Skrýt legendu"
                    title="Skrýt legendu"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Skrýt</span>
                  </button>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 min-w-[14px] min-h-[14px] rounded-full bg-red-600 border-2 border-white shadow shrink-0" />
                    <span>ZZS Středočeského kraje, p.o. – ředitelství<br />Krajské operační středisko, Výjezdové stanoviště</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 min-w-[14px] min-h-[14px] rounded-full bg-slate-900 border-2 border-white shadow shrink-0" />
                    <span>Výjezdové stanoviště ZZS SK, p.o.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 min-w-[14px] min-h-[14px] rounded-full bg-blue-600 border-2 border-white shadow shrink-0" />
                    <span>Vodní záchranná služba ZZS SK, p.o.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 min-w-[14px] min-h-[14px] rounded-full bg-green-600 border-2 border-white shadow shrink-0" />
                    <span>Smluvní partneři: Asociace Samaritánů ČR, Trans Hospital</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-2">
                  <p className="font-semibold text-slate-800 mb-1">Posádky</p>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800">{crewTotals.RV} x RV</span>{' '}
                      – Rande vous
                    </p>
                    <p className="text-[11px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">{crewTotals.RLP} x RLP</span>{' '}
                      – rychlá lékařská posádka
                    </p>
                    <p className="text-[11px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">{crewTotals.RZP} x RZP</span>{' '}
                      – rychlá zdravotnická posádka
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {loadingBoundaries && (
            <div className="absolute top-16 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow border border-blue-100 flex items-center gap-2 text-xs text-blue-800 z-[400]">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Načítám geodata okresů...
            </div>
          )}

          {mapError && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {mapError}
            </div>
          )}

          <button
            onClick={() => setActiveTab(activeTab === 'map' ? 'list' : 'map')}
            className="md:hidden fixed z-[1200] bg-blue-900 text-white p-3 rounded-full shadow-xl"
            style={{
              right: 'calc(1rem + env(safe-area-inset-right))',
              bottom: 'calc(1rem + env(safe-area-inset-bottom))',
            }}
          >
            <Menu className="w-6 h-6" />
          </button>
        </main>
      </div>
    </div>
  );
};

export default App;
