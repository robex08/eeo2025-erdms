import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiChevronDown, FiChevronUp, FiMapPin, FiX, FiSearch, FiLayers, FiZoomIn, FiMaximize, FiMinimize, FiNavigation } from 'react-icons/fi';
import '../../styles/components/StationsMapBlock.css';

// --- DATA: Seznam stanic ZZS SČK ---
const RAW_STATIONS = [
  // Kladno a okolí
  { id: 1, city: "Kladno", address: "Vančurova 1544 (areál nemocnice), 272 01 Kladno", crews: ["RV", "RZP", "RZP", "RZP"], coords: [50.1435, 14.0988], type: "main" },
  { id: 2, city: "Slaný", address: "Výjezdová základna Slaný (ASČR)", crews: ["RV", "RZP", "RZP"], coords: [50.2309, 14.0872], type: "partner" },
  { id: 3, city: "Rakovník", address: "Dukelských Hrdinů 200, 269 01 Rakovník", crews: ["RV", "RZP", "RZP"], coords: [50.1064, 13.7317], type: "standard" },
  { id: 4, city: "Jesenice u Rakovníka", address: "Plzeňská 420, 270 33 Jesenice u Rakovníka", crews: ["RZP"], coords: [50.0963, 13.4735], type: "standard" },
  { id: 5, city: "Nové Strašecí", address: "Čsl. Armády 414, 271 01, Nové Strašecí", crews: ["RZP"], coords: [50.1534, 13.9011], type: "standard" },
  { id: 6, city: "Roztoky u Křivoklátu", address: "Roztoky č.p. 275, 270 23 Křivoklát", crews: ["RZP"], coords: [50.0267, 13.8646], type: "standard" },
  
  // Beroun a okolí
  { id: 7, city: "Beroun", address: "Prof. Veselého 461, 266 01 Beroun", crews: ["RV", "RZP"], coords: [49.9668, 14.0724], type: "main" },
  { id: 8, city: "Zdice", address: "Čs. armády 18, Zdice", crews: ["RZP"], coords: [49.9142, 13.9785], type: "standard" },
  { id: 9, city: "Hořovice", address: "Pod Nádražím 654, 268 01 Hořovice", crews: ["RLP", "RZP"], coords: [49.8366, 13.9034], type: "standard" },
  { id: 10, city: "Řevnice", address: "Trans Hospital, Řevnice", crews: ["RLP"], coords: [49.9145, 14.2447], type: "partner" },
  
  // Příbram a jih
  { id: 11, city: "Příbram", address: "Školní 70, 261 95 Příbram", crews: ["RV", "RZP", "RZP", "RZP"], coords: [49.6896, 14.0104], type: "main" },
  { id: 12, city: "Dobříš", address: "Průmyslová 2121, 263 01 Dobříš", crews: ["RZP"], coords: [49.7827, 14.1706], type: "standard" },
  { id: 13, city: "Březnice", address: "Sadová 618, 262 72 Březnice", crews: ["RZP"], coords: [49.5574, 13.9542], type: "standard" },
  { id: 14, city: "Krásná Hora", address: "Krásná Hora nad Vltavou 192, 262 55", crews: ["RZP"], coords: [49.5936, 14.2835], type: "standard" },
  { id: 15, city: "Sedlčany", address: "Tyršova 160, 264 01 Sedlčany", crews: ["RV", "RZP", "RZP"], coords: [49.6587, 14.4258], type: "standard" },
  
  // Praha - Západ/Východ
  { id: 16, city: "Roztoky u Prahy", address: "Masarykova 2514, 252 63 Roztoky", crews: ["RZP"], coords: [50.1585, 14.3983], type: "standard" },
  { id: 17, city: "Hostivice", address: "Jiráskova 201, 253 01 Hostivice", crews: ["RV", "RZP"], coords: [50.0815, 14.2573], type: "standard" },
  { id: 18, city: "Zbraslav", address: "Žitavského čp. 497, 156 00 Praha - Zbraslav", crews: ["RV", "RZP"], coords: [49.9765, 14.3938], type: "partner" },
  { id: 19, city: "Jesenice u Prahy", address: "Budějovická 77, 252 42 Jesenice", crews: ["RV", "RZP"], coords: [49.9705, 14.5126], type: "standard" },
  { id: 20, city: "Davle", address: "Davle (ASČR)", crews: ["RZP"], coords: [49.8893, 14.3995], type: "partner" },
  { id: 21, city: "Mníšek pod Brdy", address: "Mníšek pod Brdy (ASČR)", crews: ["RV", "RZP"], coords: [49.8665, 14.2618], type: "partner" },
  { id: 22, city: "Hradištko", address: "Ve Dvoře 3, Hradištko", crews: ["RZP", "RZP"], coords: [49.8693, 14.4158], type: "standard" },
  { id: 23, city: "Ždáň (Slapy)", address: "Osada Ždáň 270, Slapy (VZS)", crews: ["RZP", "BOAT"], coords: [49.8105, 14.4277], type: "seasonal" },
  { id: 48, city: "Orlík", address: "Marina Orlík, Chrást (VZS)", crews: ["RZP", "BOAT"], coords: [49.5156, 14.1597], type: "seasonal" },
  
  // Mělník, Mladá Boleslav
  { id: 24, city: "Mělník", address: "Bezručova 3409, 276 01 Mělník", crews: ["RV", "RZP", "RZP"], coords: [50.3542, 14.4754], type: "main" },
  { id: 25, city: "Kralupy nad Vltavou", address: "Kralupy nad Vltavou (ASČR)", crews: ["RV", "RZP"], coords: [50.2413, 14.3117], type: "partner" },
  { id: 26, city: "Neratovice", address: "Ed. Urxe 1027, 277 11, Neratovice", crews: ["RZP"], coords: [50.2588, 14.5168], type: "standard" },
  { id: 27, city: "Zdiby", address: "Ústecká 98, 250 66 Zdiby", crews: ["RZP"], coords: [50.1802, 14.4491], type: "standard" },
  { id: 28, city: "Mladá Boleslav", address: "Laurinova 333, 293 01 Mladá Boleslav", crews: ["RV", "RZP", "RZP"], coords: [50.4124, 14.9026], type: "main" },
  { id: 29, city: "Mnichovo Hradiště", address: "Jiráskova 1533, 259 01 Mnichovo Hradiště", crews: ["RZP"], coords: [50.5228, 14.9744], type: "standard" },
  { id: 30, city: "Benátky nad Jizerou", address: "Pražská 123, 294 71 Benátky n. J.", crews: ["RZP"], coords: [50.2905, 14.8236], type: "standard" },
  
  // Polabí
  { id: 31, city: "Brandýs nad Labem", address: "Františka Melichara 370, 251 01", crews: ["RV", "RZP", "RZP"], coords: [50.1873, 14.6613], type: "standard" },
  { id: 32, city: "Nymburk", address: "Smetanova 55, 288 02 Nymburk", crews: ["RV", "RZP", "RZP"], coords: [50.1860, 15.0416], type: "main" },
  { id: 33, city: "Lysá nad Labem", address: "Masarykova 214, 289 22 Lysá n/L.", crews: ["RZP"], coords: [50.2016, 14.8398], type: "standard" },
  { id: 34, city: "Městec Králové", address: "Prezidenta Beneše 343, 289 03", crews: ["RZP"], coords: [50.2075, 15.3006], type: "standard" },
  { id: 35, city: "Český Brod", address: "Žižkova 282, 282 01 Český Brod", crews: ["RZP"], coords: [50.0743, 14.8612], type: "standard" },
  
  // Východ a Jihovýchod
  { id: 36, city: "Kolín", address: "Žižkova 146, 280 02 Kolín", crews: ["RV", "RZP", "RZP", "RZP"], coords: [50.0267, 15.1973], type: "main" },
  { id: 37, city: "Kutná Hora", address: "Vojtěšská 687, 284 00 Kutná Hora", crews: ["RV", "RZP", "RZP"], coords: [49.9489, 15.2678], type: "main" },
  { id: 38, city: "Čáslav", address: "Jeníkovská 348, 286 01 Čáslav", crews: ["RLP", "RZP"], coords: [49.9126, 15.3937], type: "standard" },
  { id: 39, city: "Uhlířské Janovice", address: "Zdravotní 108, 285 04 Uhlířské Janovice", crews: ["RZP"], coords: [49.8817, 15.0634], type: "standard" },
  { id: 40, city: "Zbraslavice", address: "Zbraslavice 329, 285 21", crews: ["RV"], coords: [49.8134, 15.1832], type: "standard" },
  { id: 41, city: "Zruč nad Sázavou", address: "Poštovní 593, 285 22 Zruč nad Sázavou", crews: ["RZP"], coords: [49.7436, 15.1018], type: "standard" },
  
  // Benešovsko
  { id: 42, city: "Benešov", address: "Máchova 400, 256 01 Benešov", crews: ["RV", "RZP", "RZP"], coords: [49.7836, 14.6865], type: "main" },
  { id: 43, city: "Říčany", address: "Komenského nám. 1910, 251 01, Říčany", crews: ["RV", "RZP", "RZP"], coords: [49.9918, 14.6617], type: "standard" },
  { id: 44, city: "Kostelec n. Č. lesy", address: "Jevanská 1293, 281 63 Kostelec n/Č.L.", crews: ["RZP"], coords: [49.9945, 14.8604], type: "standard" },
  { id: 45, city: "Vranov", address: "Vranov 58, 257 22 Čerčany", crews: ["RZP"], coords: [49.8687, 14.7712], type: "standard" },
  { id: 46, city: "Votice", address: "Pražská 290, 259 01 Votice", crews: ["RZP"], coords: [49.6384, 14.6375], type: "standard" },
  { id: 47, city: "Vlašim", address: "J. Masaryka 1711, 258 01 Vlašim", crews: ["RV", "RZP", "RZP"], coords: [49.7047, 14.9015], type: "standard" },
];

const StationsMapBlock = ({ vehicles = [] }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedStation, setSelectedStation] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [loadingBoundaries, setLoadingBoundaries] = useState(false);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(8);
  
  // Tools panel state
  const [addressSearch, setAddressSearch] = useState('');
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [baseLayer, setBaseLayer] = useState('osm'); // 'light', 'dark', 'satellite', 'osm'
  const [mapOpacity, setMapOpacity] = useState(1);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [showDistrictFill, setShowDistrictFill] = useState(false); // Vypnutá výplň okresů
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleSearchResults, setVehicleSearchResults] = useState([]);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const vehicleMarkersRef = useRef({});
  const boundariesLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const searchMarkerRef = useRef(null);
  const districtLabelsRef = useRef([]);

  // Názvy a pozice okresů Středočeského kraje pro popisky
  const DISTRICT_LABELS = [
    { name: 'BENEŠOV', coords: [49.78, 14.69] },
    { name: 'BEROUN', coords: [49.96, 14.07] },
    { name: 'KLADNO', coords: [50.14, 14.10] },
    { name: 'KOLÍN', coords: [50.03, 15.20] },
    { name: 'KUTNÁ HORA', coords: [49.95, 15.27] },
    { name: 'MĚLNÍK', coords: [50.35, 14.47] },
    { name: 'MLADÁ BOLESLAV', coords: [50.41, 14.90] },
    { name: 'NYMBURK', coords: [50.19, 15.04] },
    { name: 'PRAHA-VÝCHOD', coords: [50.08, 14.65] },
    { name: 'PRAHA-ZÁPAD', coords: [49.93, 14.32] },
    { name: 'PŘÍBRAM', coords: [49.69, 14.01] },
    { name: 'RAKOVNÍK', coords: [50.10, 13.73] }
  ];

  const aggregateCrews = (crews) => {
    const counts = crews.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {});
    
    // Mapování kódů na české názvy
    const crewNames = {
      'RLP': 'RLP',
      'RV': 'RV',
      'RZP': 'RZP',
      'BOAT': 'Člun'
    };
    
    const order = ['RLP', 'RV', 'RZP', 'BOAT'];
    return Object.entries(counts)
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([type, count]) => ({ 
        type, 
        count, 
        label: `${count}x ${crewNames[type] || type}` 
      }));
  };

  const filteredStations = useMemo(() => {
    return RAW_STATIONS.filter(station => {
      const matchesSearch = station.city.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            station.address.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesType = true;
      if (filterType === 'DOCTOR') {
        matchesType = station.crews.includes('RV') || station.crews.includes('RLP');
      } else if (filterType === 'RZP') {
        matchesType = !station.crews.includes('RV') && !station.crews.includes('RLP');
      }

      return matchesSearch && matchesType;
    });
  }, [searchTerm, filterType]);

  useEffect(() => {
    if (!isCollapsed && !mapInstanceRef.current) {
      // Leaflet CSS - přidej jen jednou
      if (!document.querySelector('link[href*="leaflet@1.9.4"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Leaflet JS - přidej jen jednou, nebo použij existující
      if (window.L) {
        initMap();
        loadRealBoundaries();
      } else if (!document.querySelector('script[src*="leaflet@1.9.4"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        
        script.onload = () => {
          initMap();
          loadRealBoundaries();
        };
        
        script.onerror = () => {
          setMapError("Nepodařilo se načíst mapové podklady (Leaflet).");
        };
        
        document.body.appendChild(script);
      }
    }
    
    // Při sbalení - zničit mapu a vyčistit reference
    if (isCollapsed && mapInstanceRef.current) {
      try {
        // Odeber markery
        Object.values(markersRef.current).forEach(m => m.remove());
        markersRef.current = {};
        Object.values(vehicleMarkersRef.current).forEach(m => m.remove());
        vehicleMarkersRef.current = {};
        removeDistrictLabels();
        
        // Zničit mapu
        mapInstanceRef.current.remove();
      } catch (e) {
        // Ignorovat chyby při cleanup
      }
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      boundariesLayerRef.current = null;
      if (searchMarkerRef.current) {
        searchMarkerRef.current = null;
      }
    }
  }, [isCollapsed]);

  // Re-render boundaries when showDistrictFill changes
  useEffect(() => {
    if (boundariesLayerRef.current && showBoundaries) {
      loadRealBoundaries();
    }
  }, [showDistrictFill]);

  const initMap = () => {
    if (!mapContainerRef.current || window.L === undefined || mapInstanceRef.current) return;

    const map = window.L.map(mapContainerRef.current, {
      zoomControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      wheelPxPerZoomLevel: 120
    }).setView([49.95, 14.6], 9);
    
    window.L.control.zoom({ position: 'topright' }).addTo(map);

    // Vytvoř tile layer - výchozí OSM
    const tileLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      opacity: mapOpacity
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    updateMarkers();
    
    // Po inicializaci mapy načti i vozidla (s malým zpožděním)
    setTimeout(() => {
      if (showVehicles && vehicles.length > 0) {
        updateVehicleMarkers();
      }
    }, 300);
  };

  const loadRealBoundaries = async () => {
    if (!mapInstanceRef.current || !window.L) return;
    if (boundariesLayerRef.current) {
      boundariesLayerRef.current.remove();
      boundariesLayerRef.current = null;
    }
    
    setLoadingBoundaries(true);

    const stredoceskeOkresy = [
      "Benešov", "Beroun", "Kladno", "Kolín", "Kutná Hora", "Mělník", 
      "Mladá Boleslav", "Nymburk", "Praha-východ", "Praha-západ", "Příbram", "Rakovník"
    ];

    const getColor = (okresName) => {
      if (!okresName) return "#facc15";
      const name = okresName.trim();

      const colors = {
        "Rakovník": "#eab308",
        "Kladno": "#fef08a",
        "Mělník": "#facc15",
        "Mladá Boleslav": "#eab308", 
        "Nymburk": "#fef08a",
        "Kolín": "#eab308",
        "Kutná Hora": "#facc15",
        "Benešov": "#fef08a",
        "Příbram": "#facc15",
        "Beroun": "#eab308",
        "Praha-západ": "#fef08a",
        "Praha-východ": "#facc15"
      };
      
      for (const [key, color] of Object.entries(colors)) {
        if (name.includes(key)) return color;
      }
      return "#facc15";
    };

    const renderData = (data) => {
      if (!data || !data.features || data.features.length === 0) {
        console.error("GeoJSON nemá features");
        return 0;
      }

      // Jednoduchá detekce - data mají geometrii přímo
      const filteredFeatures = data.features.filter(f => f.geometry && f.geometry.coordinates);

      if (filteredFeatures.length === 0) {
        console.error("Žádné validní geometrie nenalezeny");
        return 0;
      }

      console.log(`Načteno ${filteredFeatures.length} okresů`);

      const layer = window.L.geoJSON({ type: "FeatureCollection", features: filteredFeatures }, {
        style: () => ({
          fillColor: "#fef08a",
          weight: 3,
          opacity: 1,
          color: '#000000',
          dashArray: '',
          fillOpacity: showDistrictFill ? 0.5 : 0
        }),
        onEachFeature: (feature, layer) => {
          // Popisky okresů - pokud máme nějakou property s názvem
          const props = feature.properties || {};
          const label = props.NAZ_LAU1 || props.name || props.NAZ_CZNUTS || '';
          
          if (label && showLabels) {
            const shortLabel = label.replace("Okres ", "").replace("okres ", "");
            
            layer.bindTooltip(shortLabel, {
              permanent: true,
              direction: "center",
              className: "district-label"
            });
          }
        }
      });

      if (showBoundaries) {
        layer.addTo(mapInstanceRef.current);
      }
      boundariesLayerRef.current = layer;
      
      return filteredFeatures.length;
    };

    try {
      // Načti lokální GeoJSON soubor - použij process.env.PUBLIC_URL pro správnou cestu
      const geojsonPath = `${process.env.PUBLIC_URL}/data/okresy-stc.geojson`;
      console.log('Načítám GeoJSON z:', geojsonPath);
      
      const response = await fetch(geojsonPath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      // Akceptuj application/json, application/geo+json nebo text/plain
      if (contentType && !contentType.includes('json') && !contentType.includes('plain')) {
        console.error('Nesprávný content-type:', contentType);
        throw new Error('Soubor není JSON formát');
      }
      
      const data = await response.json();
      console.log('GeoJSON načten, features:', data.features?.length || 0);
      
      const count = renderData(data);
      
      if (count > 0) {
        console.log(`✓ Úspěšně vykresleno ${count} okresů`);
        
        // Vykresli popisky okresů, pokud jsou zapnuté
        if (showLabels && showBoundaries) {
          renderDistrictLabels();
        }
        
        setLoadingBoundaries(false);
        setMapError(null);
      } else {
        throw new Error("Žádné okresy nenalezeny v GeoJSON");
      }
    } catch (error) {
      console.error("Chyba při načítání hranic:", error);
      setMapError(`Nepodařilo se načíst hranice okresů: ${error.message}`);
      setLoadingBoundaries(false);
    }
  };

  // Toggle boundaries visibility
  const toggleBoundaries = () => {
    if (!boundariesLayerRef.current || !mapInstanceRef.current) return;
    
    if (showBoundaries) {
      boundariesLayerRef.current.remove();
      removeDistrictLabels();
    } else {
      boundariesLayerRef.current.addTo(mapInstanceRef.current);
      if (showLabels) {
        renderDistrictLabels();
      }
    }
    setShowBoundaries(!showBoundaries);
  };

  // Render district labels
  const renderDistrictLabels = () => {
    if (!mapInstanceRef.current || !window.L) return;
    
    // Odeber staré popisky
    removeDistrictLabels();
    
    // Vytvoř nové popisky
    DISTRICT_LABELS.forEach(district => {
      const marker = window.L.marker(district.coords, {
        icon: window.L.divIcon({
          className: 'district-label-marker',
          html: `<div class="district-label-text">${district.name}</div>`,
          iconSize: [120, 20],
          iconAnchor: [60, 10]
        }),
        interactive: false
      }).addTo(mapInstanceRef.current);
      
      districtLabelsRef.current.push(marker);
    });
  };

  // Remove district labels
  const removeDistrictLabels = () => {
    districtLabelsRef.current.forEach(marker => marker.remove());
    districtLabelsRef.current = [];
  };

  // Zoom to full extent
  const zoomToFullExtent = () => {
    if (!mapInstanceRef.current) return;
    // Souřadnice pro celý Středočeský kraj
    mapInstanceRef.current.setView([49.95, 14.6], 9);
  };

  // Change base layer
  const changeBaseLayer = (layerType) => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    
    // Odeber starý layer
    tileLayerRef.current.remove();
    
    // URLs pro různé podkladové mapy
    const layerConfigs = {
      light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      },
      dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
      },
      osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }
    };
    
    const config = layerConfigs[layerType] || layerConfigs.light;
    
    // Přidej nový layer
    const newLayer = window.L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: 19,
      opacity: mapOpacity
    }).addTo(mapInstanceRef.current);
    
    tileLayerRef.current = newLayer;
    setBaseLayer(layerType);
  };

  // Change map opacity
  const changeMapOpacity = (opacity) => {
    setMapOpacity(opacity);
    if (tileLayerRef.current) {
      tileLayerRef.current.setOpacity(opacity);
    }
  };

  // Search for address using Nominatim API
  const searchAddress = async () => {
    if (!addressSearch.trim() || !mapInstanceRef.current) return;
    
    setSearchingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressSearch)}&countrycodes=cz&limit=1`
      );
      
      if (!response.ok) throw new Error('Vyhledávání selhalo');
      
      const results = await response.json();
      
      if (results.length === 0) {
        alert('Adresa nenalezena. Zkuste zadat jinak.');
        setSearchingAddress(false);
        return;
      }
      
      const result = results[0];
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      
      // Odeber starý marker pokud existuje
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
      }
      
      // Přidej nový marker
      const marker = window.L.marker([lat, lon], {
        icon: window.L.divIcon({
          className: 'search-result-marker',
          html: '<div class="marker-pulse"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(mapInstanceRef.current);
      
      marker.bindPopup(`
        <div class="search-popup">
          <strong>${result.display_name}</strong>
        </div>
      `).openPopup();
      
      searchMarkerRef.current = marker;
      
      // Přelet na místo
      mapInstanceRef.current.setView([lat, lon], 14);
      
    } catch (error) {
      console.error('Chyba při vyhledávání adresy:', error);
      alert('Chyba při vyhledávání adresy');
    } finally {
      setSearchingAddress(false);
    }
  };

  useEffect(() => {
    if (!isCollapsed && mapInstanceRef.current) {
      updateMarkers();
    }
  }, [filteredStations, isCollapsed]);

  // Reload boundaries when labels visibility changes
  useEffect(() => {
    if (!isCollapsed && mapInstanceRef.current && boundariesLayerRef.current) {
      loadRealBoundaries();
    }
  }, [showLabels]);

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.L) return;

    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    filteredStations.forEach(station => {
      let markerColor = "marker-standard"; 
      
      if (station.city === "Kladno") {
        markerColor = "marker-kladno";
      } else if (station.type === "partner") {
        markerColor = "marker-partner";
      } else if (station.type === "seasonal") {
        markerColor = "marker-seasonal";
      }

      const iconHtml = `
        <div class="custom-marker ${markerColor}">
          <div class="marker-dot"></div>
        </div>
      `;
      
      const icon = window.L.divIcon({
        className: 'custom-div-icon',
        html: iconHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const aggregated = aggregateCrews(station.crews);
      const crewsHtml = aggregated.map(c => 
        `<span class="crew-badge ${c.type === 'RZP' ? 'crew-rzp' : 'crew-doctor'}">${c.label}</span>`
      ).join('');

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.coords[0]},${station.coords[1]}`;
      const wazeUrl = `https://waze.com/ul?ll=${station.coords[0]},${station.coords[1]}&navigate=yes`;

      const marker = window.L.marker(station.coords, { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div class="station-popup">
            <h3 class="popup-title">${station.city}</h3>
            <p class="popup-address">${station.address}</p>
            <div class="popup-crews">
              ${crewsHtml}
            </div>
            <div class="popup-navigation">
              <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="nav-link-icon" title="Navigovat v Google Maps">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
              </a>
              <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" class="nav-link-icon" title="Navigovat ve Waze">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
              </a>
            </div>
          </div>
        `);
      
      marker.on('click', () => {
        setSelectedStation(station);
      });

      markersRef.current[station.id] = marker;
    });
  };

  const handleStationClick = (station) => {
    if (mapInstanceRef.current && window.L) {
      mapInstanceRef.current.flyTo(station.coords, 13);
      const marker = markersRef.current[station.id];
      if (marker) marker.openPopup();
    }
  };

  // Funkce pro určení barvy vozidla podle typu
  const getVehicleColor = (zzs_typ) => {
    const typ = (zzs_typ || '').toUpperCase();
    if (typ.includes('RLP') || typ.includes('LÉKAŘ')) return '#dc2626'; // Červená - RLP/Lékař
    if (typ.includes('RV')) return '#ea580c'; // Oranžová - RV
    if (typ.includes('RZP')) return '#2563eb'; // Modrá - RZP
    if (typ.includes('REF') || typ.includes('REFERENT')) return '#7c3aed'; // Fialová - Referentské
    return '#64748b'; // Šedá - Ostatní
  };

  // Vykreslení vozidel na mapě
  const updateVehicleMarkers = () => {
    if (!mapInstanceRef.current || !window.L || !showVehicles) {
      // Pokud nemáme zobrazovat vozidla, odstraníme všechny markery
      Object.values(vehicleMarkersRef.current).forEach(marker => marker.remove());
      vehicleMarkersRef.current = {};
      return;
    }

    // Odstranit staré markery
    Object.values(vehicleMarkersRef.current).forEach(marker => marker.remove());
    vehicleMarkersRef.current = {};

    // Zobrazit pouze vozidla se souřadnicemi
    const vehiclesWithCoords = vehicles.filter(v => v.pos_zs && v.pos_zd);

    vehiclesWithCoords.forEach(vehicle => {
      const lat = parseFloat(vehicle.pos_zs);
      const lon = parseFloat(vehicle.pos_zd);
      
      // Validace souřadnic
      if (isNaN(lat) || isNaN(lon) || lat < 48 || lat > 52 || lon < 12 || lon > 19) {
        return; // Přeskočit neplatné souřadnice
      }

      const color = getVehicleColor(vehicle.zzs_typ);
      const spz = vehicle.w_spz || 'N/A';

      // Ikona auta (SVG) - zjednodušená silueta sanitky
      const carSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="10" width="18" height="8" rx="2"/>
          <circle cx="7" cy="18" r="2" fill="#fff" stroke="${color}" stroke-width="2"/>
          <circle cx="17" cy="18" r="2" fill="#fff" stroke="${color}" stroke-width="2"/>
          <path d="M3 10V8a2 2 0 0 1 2-2h4l3 4H3z"/>
          <rect x="14" y="6" width="4" height="4" rx="1" fill="#fff" stroke="${color}"/>
        </svg>
      `;

      const showSpz = currentZoom >= 12;
      
      const iconHtml = `
        <div class="vehicle-marker">
          ${carSvg}
          ${showSpz ? `<div class="vehicle-spz" style="color: ${color};">${spz}</div>` : ''}
        </div>
      `;

      const icon = window.L.divIcon({
        className: 'vehicle-div-icon',
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const km = vehicle.pos_km ? `${parseInt(vehicle.pos_km).toLocaleString('cs-CZ')} km` : 'N/A';
      
      // Formátovat datum aktualizace v českém formátu
      let lastUpdate = 'N/A';
      if (vehicle.dt_aktualizace) {
        try {
          const date = new Date(vehicle.dt_aktualizace);
          if (!isNaN(date.getTime())) {
            lastUpdate = date.toLocaleString('cs-CZ', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          } else {
            lastUpdate = vehicle.dt_aktualizace;
          }
        } catch (e) {
          lastUpdate = vehicle.dt_aktualizace;
        }
      }
      
      const typBadgeClass = (vehicle.zzs_typ || '').includes('RLP') || (vehicle.zzs_typ || '').includes('RV') ? 'crew-doctor' : 'crew-rzp';
      
      // Najít adresu stanoviště
      const station = RAW_STATIONS.find(s => s.city === vehicle.w_groupname);
      const stationAddress = station ? station.address : '';
      
      // Výpočet stáří vozidla a formátování data zařazení
      let zasmlouvnenoOd = vehicle.w_datod || vehicle.Datum_od || 'N/A';
      let vehicleAge = '';
      
      if (zasmlouvnenoOd !== 'N/A') {
        // Odstranit T a vše za datem (YYYY-MM-DDTHH:MM:SS, YYYY-MM-DD HH:MM:SS)
        zasmlouvnenoOd = String(zasmlouvnenoOd).split('T')[0].split(' ')[0];
        
        // SQL formát YYYY-MM-DD → DD.MM.YYYY
        const sqlMatch = zasmlouvnenoOd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (sqlMatch) {
          zasmlouvnenoOd = `${sqlMatch[3]}. ${sqlMatch[2]}. ${sqlMatch[1]}`;
        }
        // Pokud je DD.MM.YYYY bez mezer, přidat mezery: DD. MM. YYYY
        const czMatch = zasmlouvnenoOd.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (czMatch) {
          zasmlouvnenoOd = `${czMatch[1].padStart(2, '0')}. ${czMatch[2].padStart(2, '0')}. ${czMatch[3]}`;
        }
      }
      
      // Výpočet stáří vozidla
      const czDateMatch = zasmlouvnenoOd.match(/(\d{2})\.\s*(\d{2})\.\s*(\d{4})/);
      if (czDateMatch) {
        const startDate = new Date(`${czDateMatch[3]}-${czDateMatch[2]}-${czDateMatch[1]}`);
        if (!isNaN(startDate.getTime())) {
          const now = new Date();
          const years = Math.floor((now - startDate) / (365.25 * 24 * 60 * 60 * 1000));
          const months = Math.floor(((now - startDate) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
          vehicleAge = years > 0 ? `${years} let ${months} měs.` : `${months} měs.`;
        }
      }
      
      // URL pro navigaci
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
      const wazeUrl = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes`;
      
      // Helper pro generování servisní historie HTML
      const generateServiceHistoryHtml = (orders = null, loading = false, error = null) => {
        if (loading) {
          return `
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span style="font-weight:700;font-size:0.82rem;color:#4338ca;">Servisní historie</span>
            </div>
            <div style="color:#94a3b8;font-size:0.78rem;">Načítám...</div>`;
        }
        if (error) {
          return `
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span style="font-weight:700;font-size:0.82rem;color:#4338ca;">Servisní historie</span>
            </div>
            <div style="color:#ef4444;font-size:0.78rem;">${error}</div>`;
        }
        if (!orders || orders.length === 0) {
          return `
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span style="font-weight:700;font-size:0.82rem;color:#4338ca;">Servisní historie</span>
            </div>
            <div style="color:#94a3b8;font-size:0.78rem;font-style:italic;">Žádné objednávky nalezeny</div>`;
        }
        const formatDate = (dt) => {
          if (!dt) return '–';
          const d = new Date(dt);
          if (isNaN(d.getTime())) return '–';
          return d.toLocaleDateString('cs-CZ');
        };
        const formatPrice = (o) => {
          const val = parseFloat(o.faktura_celkem) > 0 ? o.faktura_celkem : o.polozky_celkem;
          if (!val || parseFloat(val) === 0) return '–';
          return parseFloat(val).toLocaleString('cs-CZ', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' Kč';
        };
        let html = `
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            <span style="font-weight:700;font-size:0.75rem;color:#4338ca;">Servisní historie (${orders.length})</span>
          </div>
          <div style="max-height:150px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#e2e8f0 transparent;margin:0 -4px;">
            <style>
              .service-history-scroll::-webkit-scrollbar { width: 4px; }
              .service-history-scroll::-webkit-scrollbar-track { background: transparent; }
              .service-history-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
              .service-history-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            </style>
            <div class="service-history-scroll" style="max-height:150px;overflow-y:auto;padding:0 4px;">`;
        orders.forEach(o => {
          html += `
            <div style="background:#f8fafc;border-radius:4px;padding:4px 6px;margin-bottom:3px;font-size:0.7rem;border-left:2px solid #6366f1;">
              <div style="margin-bottom:2px;">
                <span style="font-weight:700;color:#1e293b;font-size:0.68rem;">${o.cislo_objednavky || '–'}</span>
              </div>
              <div style="text-align:right;margin-bottom:2px;">
                <span style="font-weight:700;color:#16a34a;font-size:0.68rem;">${formatPrice(o)}</span>
              </div>
              <div style="color:#475569;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.3;" title="${(o.predmet || '').replace(/"/g, '&quot;')}">${o.predmet || '–'}</div>
              <div style="display:flex;justify-content:space-between;color:#334155;font-size:0.65rem;">
                <span>Odes: ${formatDate(o.dt_odeslani)}</span>
                <span>Potv: ${formatDate(o.dt_akceptace)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;color:#334155;font-size:0.65rem;margin-top:1px;">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">${o.dodavatel_nazev || '–'}</span>
                <span style="background:#e0e7ff;color:#4338ca;padding:0 3px;border-radius:2px;font-size:0.62rem;font-weight:600;white-space:nowrap;">${o.stav_objednavky || '–'}</span>
              </div>
            </div>`;
        });
        html += '</div></div>';
        return html;
      };
      
      // Funkce pro generování celého popup HTML
      const generatePopupContent = (serviceHistoryHtml) => `
        <style>
          .vehicle-popup-full-width .leaflet-popup-content-wrapper { padding: 5px !important; }
          .vehicle-popup-full-width .leaflet-popup-content { margin: 0 !important; }
        </style>
        <div style="font-family:system-ui,-apple-system,sans-serif;overflow:hidden;">
          <div style="display:flex;align-items:flex-start;gap:8px;padding-bottom:6px;margin-bottom:6px;border-bottom:2px solid #e2e8f0;">
            <div style="width:32px;height:32px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none">
                <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
              </svg>
            </div>
            <div style="flex:1;min-width:0;overflow:hidden;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;margin-bottom:3px;">
                <span style="font-weight:700;font-size:0.9rem;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${vehicle.w_popis || 'N/A'}</span>
                <span style="font-weight:700;font-size:0.85rem;color:#475569;white-space:nowrap;flex-shrink:0;">${spz}</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:4px;">
                <span class="vehicle-type-badge ${typBadgeClass}" style="padding:2px 6px;border-radius:4px;font-size:0.68rem;font-weight:700;text-transform:uppercase;flex-shrink:0;">${vehicle.zzs_typ || 'N/A'}</span>
                <span style="font-size:0.78rem;color:#64748b;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${vehicle.w_groupname || 'N/A'}</span>
              </div>
            </div>
          </div>
          ${stationAddress ? `
          <div style="background:#eff6ff;border-left:3px solid #3b82f6;padding:4px 6px;margin-bottom:6px;border-radius:4px;font-size:0.75rem;color:#1e293b;">${stationAddress}</div>
          ` : ''}
          ${vehicle.pos_ln ? `
          <div style="display:flex;align-items:center;gap:4px;padding:3px 5px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px;margin-bottom:4px;font-size:0.75rem;color:#1e293b;">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${vehicle.pos_ln}</span>
          </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 5px;background:#f8fafc;border-radius:4px;margin-bottom:3px;font-size:0.78rem;">
            <span style="color:#64748b;">Nájezd:</span>
            <span style="font-weight:700;color:${parseInt(vehicle.pos_km) > 300000 ? '#dc2626' : '#16a34a'};">${km}</span>
          </div>
          ${zasmlouvnenoOd !== 'N/A' ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 5px;background:#f8fafc;border-radius:4px;margin-bottom:3px;font-size:0.78rem;">
            <span style="color:#64748b;">Zařazeno:</span>
            <span style="font-weight:700;color:#1e293b;">${zasmlouvnenoOd}</span>
          </div>
          ` : ''}
          ${vehicleAge ? `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 5px;background:#f8fafc;border-radius:4px;margin-bottom:3px;font-size:0.78rem;">
            <span style="color:#64748b;">V provozu:</span>
            <span style="font-weight:700;color:#1e293b;">${vehicleAge}</span>
          </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;align-items:center;padding:2px 5px;font-size:0.7rem;margin-bottom:5px;">
            <span style="color:#94a3b8;">Aktualizace:</span>
            <span style="color:#64748b;">${lastUpdate}</span>
          </div>
          <div style="display:flex;gap:6px;padding-top:5px;border-top:1px solid #e2e8f0;">
            <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;color:#475569;text-decoration:none;" title="Google Maps">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
            </a>
            <a href="${wazeUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;color:#475569;text-decoration:none;" title="Waze">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
            </a>
          </div>
          <div style="margin-top:6px;border-top:1px solid #e2e8f0;padding-top:5px;">
            ${serviceHistoryHtml}
          </div>
        </div>
      `;

      // Vytvoř marker s loading stavem
      const initialContent = generatePopupContent(generateServiceHistoryHtml(null, true));
      const marker = window.L.marker([lat, lon], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(initialContent, { maxWidth: 320, minWidth: 280, className: 'vehicle-popup-full-width' });

      // Lazy-load servisní historie po otevření popupu
      let historyLoaded = false;
      marker.on('popupopen', async () => {
        if (historyLoaded) return; // Už jsme načetli
        historyLoaded = true;
        
        console.log('[ServiceHistory] 🔍 Popup otevřen pro vozidlo:', vehicle.w_carid, 'SPZ:', spz);
        
        if (!spz || spz === 'N/A') {
          console.warn('[ServiceHistory] ⚠️ Chybí SPZ pro vozidlo:', vehicle.w_carid);
          const errorHtml = generateServiceHistoryHtml(null, false, 'SPZ není k dispozici');
          marker.getPopup().setContent(generatePopupContent(errorHtml));
          return;
        }
        
        try {
          const API_URL = process.env.REACT_APP_APIURL_GET;
          const query = new URLSearchParams({ action: 'dbServiceHistory', spz: spz }).toString();
          const url = `${API_URL}?${query}`;
          
          console.log('[ServiceHistory] 📡 Načítám historii pro SPZ:', spz);
          console.log('[ServiceHistory] 🌐 URL:', url);
          
          const resp = await fetch(url);
          
          console.log('[ServiceHistory] ✅ Response status:', resp.status, resp.statusText);
          
          if (!resp.ok) {
            const errorText = await resp.text();
            console.error('[ServiceHistory] ❌ HTTP error:', resp.status, errorText);
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
          }
          
          const json = await resp.json();
          console.log('[ServiceHistory] 📦 Response data:', json);
          
          const orders = json.orders || json.data || [];
          
          // Seřaď od nejnovější po nejstarší
          orders.sort((a, b) => {
            const dateA = new Date(a.dt_odeslani || a.dt_akceptace || 0);
            const dateB = new Date(b.dt_odeslani || b.dt_akceptace || 0);
            return dateB - dateA; // Descending
          });
          
          console.log('[ServiceHistory] 📋 Počet objednávek:', orders.length);

          // Vygeneruj nový HTML s daty
          const serviceHistoryHtml = generateServiceHistoryHtml(orders);
          const newPopupContent = generatePopupContent(serviceHistoryHtml);
          
          console.log('[ServiceHistory] 🔄 Aktualizuji popup s novým contentem...');
          marker.getPopup().setContent(newPopupContent);
          console.log('[ServiceHistory] ✅ Hotovo!');
        } catch (err) {
          console.error('[ServiceHistory] ❌ Chyba při načítání:', err);
          const errorHtml = generateServiceHistoryHtml(null, false, `Chyba: ${err.message}`);
          marker.getPopup().setContent(generatePopupContent(errorHtml));
        }
      });

      vehicleMarkersRef.current[vehicle.w_carid] = marker;
    });
  };

  // useEffect pro aktualizaci vozidel při změně dat nebo zobrazení
  useEffect(() => {
    // Počkat až bude mapa inicializovaná
    if (!mapInstanceRef.current) return;
    
    // Malé zpoždění aby se mapa stihla vykreslit
    const timer = setTimeout(() => {
      updateVehicleMarkers();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [vehicles, showVehicles, currentZoom]);

  // useEffect pro sledování zoom úrovně
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const handleZoom = () => {
      const zoom = mapInstanceRef.current.getZoom();
      setCurrentZoom(zoom);
    };
    
    mapInstanceRef.current.on('zoomend', handleZoom);
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off('zoomend', handleZoom);
      }
    };
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Invalidate map size after fullscreen change
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
  };

  // Vyhledávání vozidel - fulltext
  const handleVehicleSearch = (term) => {
    setVehicleSearch(term);
    if (!term.trim()) {
      setVehicleSearchResults([]);
      return;
    }
    const q = term.toLowerCase().trim();
    const results = vehicles.filter(v => {
      const fields = [
        v.w_popis, v.w_spz, v.zzs_typ, v.w_groupname, v.w_stanoviste,
        v.w_volaci_znak, v.pos_km ? String(v.pos_km) : '', v.pos_ln
      ];
      return fields.some(f => f && String(f).toLowerCase().includes(q));
    }).slice(0, 8); // max 8 výsledků
    setVehicleSearchResults(results);
  };

  // Zoom na vozidlo + blikací efekt
  const zoomToVehicle = (vehicle) => {
    if (!mapInstanceRef.current || !window.L) return;
    const lat = parseFloat(vehicle.pos_zs);
    const lon = parseFloat(vehicle.pos_zd);
    if (isNaN(lat) || isNaN(lon)) return;

    // Zavřít hledání
    setVehicleSearch('');
    setVehicleSearchResults([]);

    // Zoom na vozidlo
    mapInstanceRef.current.setView([lat, lon], 15, { animate: true, duration: 0.8 });

    // Blikací efekt - pulsující kruh
    const pulseIcon = window.L.divIcon({
      className: 'vehicle-pulse-marker',
      html: '<div class="vehicle-pulse-ring"></div>',
      iconSize: [60, 60],
      iconAnchor: [30, 30]
    });
    const pulseMarker = window.L.marker([lat, lon], { icon: pulseIcon, interactive: false })
      .addTo(mapInstanceRef.current);

    // Otevřít popup vozidla
    const vehicleMarker = vehicleMarkersRef.current[vehicle.w_carid];
    if (vehicleMarker) {
      setTimeout(() => vehicleMarker.openPopup(), 800);
    }

    // Odebrat blikání po 3 sekundách
    setTimeout(() => {
      if (mapInstanceRef.current && pulseMarker) {
        pulseMarker.remove();
      }
    }, 3000);
  };

  return (
    <div className={`stations-map-block ${isFullscreen ? 'fullscreen' : ''}`}>
      <div className="block-header" onClick={(e) => {
        // Zabránit sbalení když klikáme na fullscreen tlačítko
        if (!e.target.closest('.fullscreen-toggle')) {
          setIsCollapsed(!isCollapsed);
        }
      }}>
        <div className="header-content">
          <FiMapPin className="header-icon" />
          <h2 className="header-title">Mapa výjezdových stanovišť ZZS SČK</h2>
          <span className="station-count">({RAW_STATIONS.length} stanovišť)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isCollapsed && (
            <button 
              className="fullscreen-toggle"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Ukončit fullscreen' : 'Fullscreen režim'}
            >
              {isFullscreen ? <FiMinimize /> : <FiMaximize />}
            </button>
          )}
          <button className="collapse-btn" aria-label={isCollapsed ? 'Rozbalit' : 'Sbalit'}>
            {isCollapsed ? <FiChevronDown /> : <FiChevronUp />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="block-content">
          <div className="map-container">
            <div className="map-sidebar">
              <div className="sidebar-controls">
                <div className="search-wrapper">
                  <input
                    type="text"
                    placeholder="Hledat stanoviště..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      className="search-clear-btn"
                      onClick={() => setSearchTerm('')}
                      title="Vymazat hledání"
                    >
                      <FiX />
                    </button>
                  )}
                </div>
                
                <div className="filter-buttons">
                  <button 
                    onClick={() => setFilterType('ALL')} 
                    className={`filter-btn ${filterType === 'ALL' ? 'active' : ''}`}
                  >
                    Vše
                  </button>
                  <button 
                    onClick={() => setFilterType('DOCTOR')} 
                    className={`filter-btn ${filterType === 'DOCTOR' ? 'active' : ''}`}
                  >
                    Lékař
                  </button>
                  <button 
                    onClick={() => setFilterType('RZP')} 
                    className={`filter-btn ${filterType === 'RZP' ? 'active' : ''}`}
                  >
                    RZP
                  </button>
                </div>
              </div>

              <div className="stations-list">
                {filteredStations.map(station => {
                  const aggregated = aggregateCrews(station.crews);
                  return (
                    <div 
                      key={station.id}
                      className="station-item"
                    >
                      <div 
                        className="station-info-clickable"
                        onClick={() => handleStationClick(station)}
                      >
                        <div className="station-info">
                          <h3 className="station-name">{station.city}</h3>
                          <p className="station-address">{station.address}</p>
                        </div>
                        <div className="station-crews-badges">
                          {aggregated.map((c, idx) => (
                            <span 
                              key={idx}
                              className={`crew-badge-small ${c.type === 'RZP' ? 'crew-rzp' : 'crew-doctor'}`}
                            >
                              {c.label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="station-nav-icons">
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${station.coords[0]},${station.coords[1]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nav-icon-btn google"
                          title="Google Maps"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                          </svg>
                        </a>
                        <a 
                          href={`https://waze.com/ul?ll=${station.coords[0]},${station.coords[1]}&navigate=yes`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nav-icon-btn waze"
                          title="Waze"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                          </svg>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="map-wrapper">
              <div ref={mapContainerRef} className="leaflet-map" />
              
              {/* Vehicle Search Box */}
              <div className="vehicle-search-box">
                <div className="vehicle-search-input-wrap">
                  <FiSearch className="vehicle-search-icon" />
                  <input
                    type="text"
                    placeholder="Hledat vozidlo (SPZ, název, typ...)"
                    className="vehicle-search-input"
                    value={vehicleSearch}
                    onChange={(e) => handleVehicleSearch(e.target.value)}
                  />
                  {vehicleSearch && (
                    <button 
                      className="vehicle-search-clear"
                      onClick={() => { setVehicleSearch(''); setVehicleSearchResults([]); }}
                    >
                      <FiX />
                    </button>
                  )}
                </div>
                {vehicleSearchResults.length > 0 && (
                  <div className="vehicle-search-results">
                    {vehicleSearchResults.map(v => (
                      <div 
                        key={v.w_carid} 
                        className="vehicle-search-result-item"
                        onClick={() => zoomToVehicle(v)}
                      >
                        <span className="vsr-name">{v.w_popis || 'N/A'}</span>
                        <span className="vsr-spz">{v.w_spz}</span>
                        <span className={`vsr-typ ${(v.zzs_typ || '').includes('RLP') || (v.zzs_typ || '').includes('RV') ? 'crew-doctor' : 'crew-rzp'}`}>{v.zzs_typ || ''}</span>
                        <span className="vsr-loc">{v.w_groupname || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
                {vehicleSearch && vehicleSearchResults.length === 0 && (
                  <div className="vehicle-search-results">
                    <div className="vehicle-search-empty">Žádné vozidlo nenalezeno</div>
                  </div>
                )}
              </div>

              {/* Tools Panel Toggle Button */}
              <button 
                onClick={() => setShowToolsPanel(!showToolsPanel)}
                className="tools-toggle-btn"
                title="Nástroje mapy"
              >
                <FiLayers />
              </button>

              {/* Advanced Tools Panel */}
              {showToolsPanel && (
                <div className="map-tools-advanced">
                  <div className="tools-header">
                    <FiLayers className="tools-icon" />
                    <span>Nástroje mapy</span>
                    <button onClick={() => setShowToolsPanel(false)} className="tools-close">
                      <FiX />
                    </button>
                  </div>

                  {/* Address Search */}
                  <div className="tool-section">
                    <label className="tool-label">
                      <FiSearch /> Vyhledat adresu
                    </label>
                    <div className="search-box">
                      <input
                        type="text"
                        placeholder="Zadejte adresu..."
                        value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                        className="address-input"
                      />
                      <button 
                        onClick={searchAddress}
                        disabled={searchingAddress}
                        className="search-btn"
                      >
                        {searchingAddress ? '...' : 'Hledat'}
                      </button>
                    </div>
                  </div>

                  {/* Base Layer Selection */}
                  <div className="tool-section">
                    <label className="tool-label">
                      <FiLayers /> Podkladová mapa
                    </label>
                    <div className="layer-buttons">
                      <button 
                        onClick={() => changeBaseLayer('light')}
                        className={`layer-btn ${baseLayer === 'light' ? 'active' : ''}`}
                      >
                        Světlá
                      </button>
                      <button 
                        onClick={() => changeBaseLayer('dark')}
                        className={`layer-btn ${baseLayer === 'dark' ? 'active' : ''}`}
                      >
                        Tmavá
                      </button>
                      <button 
                        onClick={() => changeBaseLayer('satellite')}
                        className={`layer-btn ${baseLayer === 'satellite' ? 'active' : ''}`}
                      >
                        Satelit
                      </button>
                      <button 
                        onClick={() => changeBaseLayer('osm')}
                        className={`layer-btn ${baseLayer === 'osm' ? 'active' : ''}`}
                      >
                        OSM
                      </button>
                    </div>
                  </div>

                  {/* Map Opacity */}
                  <div className="tool-section">
                    <label className="tool-label">
                      Průhlednost mapy: {Math.round(mapOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={mapOpacity}
                      onChange={(e) => changeMapOpacity(parseFloat(e.target.value))}
                      className="opacity-slider"
                    />
                  </div>

                  {/* View Controls */}
                  <div className="tool-section">
                    <label className="tool-label">
                      <FiZoomIn /> Zobrazení
                    </label>
                    <button 
                      onClick={zoomToFullExtent}
                      className="tool-action-btn"
                    >
                      <FiMapPin /> Zoom na Středočeský kraj
                    </button>
                  </div>

                  {/* Layer Toggles */}
                  <div className="tool-section">
                    <label className="tool-label">Vrstvy</label>
                    <div className="toggle-group">
                      <label className="toggle-item">
                        <input
                          type="checkbox"
                          checked={showBoundaries}
                          onChange={toggleBoundaries}
                        />
                        <span>Hranice okresů</span>
                      </label>
                      <label className="toggle-item">
                        <input
                          type="checkbox"
                          checked={showDistrictFill}
                          onChange={() => setShowDistrictFill(!showDistrictFill)}
                        />
                        <span>Výplň okresů</span>
                      </label>
                      <label className="toggle-item">
                        <input
                          type="checkbox"
                          checked={showLabels}
                          onChange={() => {
                            const newShowLabels = !showLabels;
                            setShowLabels(newShowLabels);
                            
                            if (showBoundaries && mapInstanceRef.current) {
                              if (newShowLabels) {
                                renderDistrictLabels();
                              } else {
                                removeDistrictLabels();
                              }
                            }
                          }}
                        />
                        <span>Popisky okresů</span>
                      </label>
                      <label className="toggle-item">
                        <input
                          type="checkbox"
                          checked={showVehicles}
                          onChange={() => setShowVehicles(!showVehicles)}
                        />
                        <span>Vozidla na mapě ({vehicles.filter(v => v.pos_zs && v.pos_zd).length})</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {loadingBoundaries && (
                <div className="map-loading">
                  Načítám geodata okresů...
                </div>
              )}

              {mapError && (
                <div className="map-error">
                  {mapError}
                </div>
              )}
            </div>
          </div>

          <div className="map-legend">
            <div className="legend-section">
              <h3 className="legend-title">Stanoviště</h3>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-dot marker-kladno"></span>
                  <span>Ředitelství ZZS SK</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot marker-standard"></span>
                  <span>Výjezdové stanoviště</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot marker-partner"></span>
                  <span>Smluvní partneři</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot marker-seasonal"></span>
                  <span>Vodní záchranná služba</span>
                </div>
              </div>
            </div>

            {showVehicles && vehicles.filter(v => v.pos_zs && v.pos_zd).length > 0 && (
              <div className="legend-section">
                <h3 className="legend-title">Vozidla</h3>
                <div className="legend-items">
                  <div className="legend-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#dc2626" stroke="#fff" stroke-width="1.5">
                      <rect x="3" y="10" width="18" height="8" rx="2"/>
                      <circle cx="7" cy="18" r="2" fill="#fff" stroke="#dc2626" stroke-width="2"/>
                      <circle cx="17" cy="18" r="2" fill="#fff" stroke="#dc2626" stroke-width="2"/>
                    </svg>
                    <span>RLP / Lékař</span>
                  </div>
                  <div className="legend-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#ea580c" stroke="#fff" stroke-width="1.5">
                      <rect x="3" y="10" width="18" height="8" rx="2"/>
                      <circle cx="7" cy="18" r="2" fill="#fff" stroke="#ea580c" stroke-width="2"/>
                      <circle cx="17" cy="18" r="2" fill="#fff" stroke="#ea580c" stroke-width="2"/>
                    </svg>
                    <span>RV</span>
                  </div>
                  <div className="legend-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#2563eb" stroke="#fff" stroke-width="1.5">
                      <rect x="3" y="10" width="18" height="8" rx="2"/>
                      <circle cx="7" cy="18" r="2" fill="#fff" stroke="#2563eb" stroke-width="2"/>
                      <circle cx="17" cy="18" r="2" fill="#fff" stroke="#2563eb" stroke-width="2"/>
                    </svg>
                    <span>RZP</span>
                  </div>
                  <div className="legend-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#7c3aed" stroke="#fff" stroke-width="1.5">
                      <rect x="3" y="10" width="18" height="8" rx="2"/>
                      <circle cx="7" cy="18" r="2" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
                      <circle cx="17" cy="18" r="2" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
                    </svg>
                    <span>Referentská</span>
                  </div>
                  <div className="legend-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#64748b" stroke="#fff" stroke-width="1.5">
                      <rect x="3" y="10" width="18" height="8" rx="2"/>
                      <circle cx="7" cy="18" r="2" fill="#fff" stroke="#64748b" stroke-width="2"/>
                      <circle cx="17" cy="18" r="2" fill="#fff" stroke="#64748b" stroke-width="2"/>
                    </svg>
                    <span>Ostatní</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StationsMapBlock;
